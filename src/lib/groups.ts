/**
 * Firestore data model (all group data lives under groups/{gid} so rules can check membership):
 *
 * invites/{code}                       → { groupId }                       (lookup for joining)
 * groups/{gid}                         → { name, ownerId, memberIds[], inviteCode, activeBattleId, createdAt }
 * groups/{gid}/members/{uid}           → profile + weekly stats + focus presence
 * groups/{gid}/shared/{id}             → shared material (pages text + flashcards)
 * groups/{gid}/battles/{bid}           → live battle state machine
 * groups/{gid}/battles/{bid}/players/{uid}
 * groups/{gid}/doubts/{id}             → doubt + AI answer;  /replies/{rid}
 * groups/{gid}/focus/state             → shared Pomodoro timer
 * groups/{gid}/calls/live              → voice call;  /participants/{uid}, /signals/{id}
 */
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { displayName, firebaseEnabled, fs, getCurrentUser } from './firebase'
import { db, getPages } from './db'
import { getStats } from './progress'
import { newCardFields } from './sm2'
import { uid as makeId, weekKey } from './utils'
import type { Mcq } from '@shared/schemas'

export const MAX_MEMBERS = 3

export interface Group {
  name: string
  ownerId: string
  memberIds: string[]
  inviteCode: string
  activeBattleId?: string | null
  createdAt?: Timestamp
  emoji?: string
}

export interface Member {
  uid: string
  name: string
  photo?: string | null
  joinedAt?: Timestamp
  weekKey?: string
  weeklyXp?: number
  totalXp?: number
  streak?: number
  accuracy?: number | null
  cardsWeek?: number
  focusMinutes?: number
  battlesWon?: number
  badges?: string[]
  level?: number
  focusing?: boolean
  focusSince?: number | null
}

export interface SharedMaterial {
  title: string
  pages: { page: number; text: string }[]
  flashcards: { front: string; back: string; page?: number | null }[]
  sharedBy: string
  sharedByName: string
  createdAt?: Timestamp
  truncated?: boolean
}

export const groupRef = (gid: string) => doc(fs(), 'groups', gid)
export const membersCol = (gid: string) => collection(fs(), 'groups', gid, 'members')
export const sharedCol = (gid: string) => collection(fs(), 'groups', gid, 'shared')
export const doubtsCol = (gid: string) => collection(fs(), 'groups', gid, 'doubts')
export const repliesCol = (gid: string, did: string) => collection(fs(), 'groups', gid, 'doubts', did, 'replies')
export const battleRef = (gid: string, bid: string) => doc(fs(), 'groups', gid, 'battles', bid)
export const playersCol = (gid: string, bid: string) => collection(fs(), 'groups', gid, 'battles', bid, 'players')
export const focusRef = (gid: string) => doc(fs(), 'groups', gid, 'focus', 'state')
export const myGroupsQuery = (uid: string) => query(collection(fs(), 'groups'), where('memberIds', 'array-contains', uid))

const memberProfile = (u: User): Member => ({ uid: u.uid, name: displayName(u), photo: u.photoURL ?? null })

const EMOJIS = ['🦉', '🚀', '🔥', '🧠', '⚡', '🎯', '🌙', '🐯']

async function newInviteCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const snap = await getDoc(doc(fs(), 'invites', code))
    if (!snap.exists()) return code
  }
  throw new Error('Could not create an invite code, please try again.')
}

export async function createGroup(name: string, user: User) {
  const code = await newInviteCode()
  const gid = makeId().replace(/-/g, '').slice(0, 20)
  const batch = writeBatch(fs())
  batch.set(groupRef(gid), {
    name: name.trim() || 'Study Squad',
    ownerId: user.uid,
    memberIds: [user.uid],
    inviteCode: code,
    activeBattleId: null,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    createdAt: serverTimestamp(),
  })
  batch.set(doc(membersCol(gid), user.uid), { ...memberProfile(user), joinedAt: serverTimestamp() })
  batch.set(doc(fs(), 'invites', code), { groupId: gid, createdBy: user.uid })
  await batch.commit()
  syncMyStats().catch(() => {})
  return gid
}

export async function joinGroupByCode(code: string, user: User) {
  const clean = code.replace(/\D/g, '')
  if (clean.length !== 6) throw new Error('Invite codes have 6 digits.')
  const inv = await getDoc(doc(fs(), 'invites', clean))
  if (!inv.exists()) throw new Error('No group found with that code.')
  const gid = inv.data().groupId as string
  try {
    const batch = writeBatch(fs())
    batch.update(groupRef(gid), { memberIds: arrayUnion(user.uid) })
    batch.set(doc(membersCol(gid), user.uid), { ...memberProfile(user), joinedAt: serverTimestamp() }, { merge: true })
    await batch.commit()
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') throw new Error(`This group is full (max ${MAX_MEMBERS} members).`)
    throw e
  }
  syncMyStats().catch(() => {})
  return gid
}

export async function leaveGroup(gid: string, group: Group, user: User) {
  const remaining = group.memberIds.filter((m) => m !== user.uid)
  await deleteDoc(doc(membersCol(gid), user.uid)).catch(() => {})
  if (remaining.length === 0) {
    await deleteDoc(doc(fs(), 'invites', group.inviteCode)).catch(() => {})
    await deleteDoc(groupRef(gid))
  } else {
    await updateDoc(groupRef(gid), {
      memberIds: arrayRemove(user.uid),
      ...(group.ownerId === user.uid ? { ownerId: remaining[0] } : {}),
    })
  }
}

export const joinUrl = (code: string) => `${location.origin}/join/${code}`

/* ---------------- Shared material ---------------- */

const MAX_SHARED_CHARS = 350_000 // stay well under Firestore's 1 MiB document limit

export async function shareDocument(gid: string, docId: string, user: User) {
  const d = await db.documents.get(docId)
  if (!d) throw new Error('Document not found')
  const pages = (await getPages(docId)).map((p) => ({ page: p.page, text: p.text }))
  let total = 0
  const kept: typeof pages = []
  for (const p of pages) {
    if (total + p.text.length > MAX_SHARED_CHARS) break
    total += p.text.length
    kept.push(p)
  }
  const cards = (await db.cards.where('docId').equals(docId).toArray()).slice(0, 150)
  const data: SharedMaterial = {
    title: d.title,
    pages: kept,
    flashcards: cards.map((c) => ({ front: c.front, back: c.back, page: c.page ?? null })),
    sharedBy: user.uid,
    sharedByName: displayName(user),
    truncated: kept.length < pages.length,
  }
  await addDoc(sharedCol(gid), { ...data, createdAt: serverTimestamp() })
}

/** Copy a friend's shared material into my local library so I can use every study tool on it. */
export async function importShared(s: SharedMaterial) {
  const id = makeId()
  await db.transaction('rw', db.documents, db.chunks, db.cards, async () => {
    await db.documents.add({
      id,
      title: `${s.title} (from ${s.sharedByName})`,
      kind: 'text',
      createdAt: Date.now(),
      pageCount: s.pages.length,
      color: (await db.documents.count()) % 5,
    })
    await db.chunks.bulkAdd(s.pages.map((p) => ({ docId: id, page: p.page, text: p.text })))
    await db.cards.bulkAdd(s.flashcards.map((c) => ({ id: makeId(), docId: id, front: c.front, back: c.back, page: c.page, ...newCardFields() })))
  })
  return id
}

/* ---------------- Stats sync (weekly leaderboard) ---------------- */

let syncTimer: ReturnType<typeof setTimeout> | undefined
export function scheduleStatsSync() {
  if (!firebaseEnabled) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => syncMyStats().catch(() => {}), 1500)
}

export async function syncMyStats() {
  const user = getCurrentUser()
  if (!firebaseEnabled || !user) return
  const s = await getStats()
  const groups = await getDocs(myGroupsQuery(user.uid))
  const payload: Partial<Member> = {
    ...memberProfile(user),
    weekKey: weekKey(),
    weeklyXp: s.weeklyXp,
    totalXp: s.totalXp,
    streak: s.streak,
    accuracy: s.weeklyAccuracy,
    cardsWeek: s.weeklyCards,
    focusMinutes: s.focusMinutes,
    battlesWon: s.battlesWon,
    badges: s.badges,
    level: s.level,
  }
  await Promise.all(groups.docs.map((g) => setDoc(doc(membersCol(g.id), user.uid), payload, { merge: true })))
}

/* ---------------- Live battle ---------------- */

export type BattleStatus = 'lobby' | 'question' | 'reveal' | 'final'

export interface Battle {
  hostId: string
  hostName: string
  title: string
  status: BattleStatus
  questions: Mcq[]
  current: number
  duration: number // seconds per question
  questionStartedAt?: number | null
  createdAt?: Timestamp
}

export interface Player {
  uid: string
  name: string
  photo?: string | null
  score: number
  answers?: Record<string, { choice: number; correct: boolean; points: number; ms: number }>
}

export async function createBattle(gid: string, user: User, title: string, questions: Mcq[], duration = 20) {
  const ref = await addDoc(collection(fs(), 'groups', gid, 'battles'), {
    hostId: user.uid,
    hostName: displayName(user),
    title,
    status: 'lobby',
    questions: questions.slice(0, 15).map((q) => ({ ...q, page: q.page ?? null, topic: q.topic ?? null })),
    current: -1,
    duration,
    questionStartedAt: null,
    createdAt: serverTimestamp(),
  })
  await updateDoc(groupRef(gid), { activeBattleId: ref.id })
  await joinBattle(gid, ref.id, user)
  return ref.id
}

export async function joinBattle(gid: string, bid: string, user: User) {
  const ref = doc(playersCol(gid, bid), user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) await setDoc(ref, { uid: user.uid, name: displayName(user), photo: user.photoURL ?? null, score: 0, answers: {} })
}

export const setBattle = (gid: string, bid: string, patch: Partial<Battle>) => updateDoc(battleRef(gid, bid), patch)

export async function endBattle(gid: string, bid: string) {
  await updateDoc(battleRef(gid, bid), { status: 'final' })
  await updateDoc(groupRef(gid), { activeBattleId: null }).catch(() => {})
}

export async function submitAnswer(gid: string, bid: string, uid: string, q: number, choice: number, correct: boolean, points: number, ms: number) {
  await updateDoc(doc(playersCol(gid, bid), uid), {
    [`answers.${q}`]: { choice, correct, points, ms },
    score: increment(points),
  })
}

/** Kahoot-style: correct answers earn 500–1000 points depending on speed. */
export const battlePoints = (correct: boolean, ms: number, durationSec: number) =>
  correct ? Math.round(500 + 500 * Math.max(0, 1 - ms / (durationSec * 1000))) : 0

/* ---------------- Doubts ---------------- */

export interface Doubt {
  text: string
  authorId: string
  authorName: string
  authorPhoto?: string | null
  sharedId?: string | null
  sourceTitle?: string | null
  aiAnswer?: { answer: string; citations: { page: number; quote: string }[] } | null
  aiStatus: 'pending' | 'done' | 'error' | 'none'
  createdAt?: Timestamp
}

export interface Reply {
  text: string
  authorId: string
  authorName: string
  authorPhoto?: string | null
  createdAt?: Timestamp
}

export async function postDoubt(gid: string, user: User, text: string, source: { sharedId?: string; title?: string } | null) {
  return addDoc(doubtsCol(gid), {
    text,
    authorId: user.uid,
    authorName: displayName(user),
    authorPhoto: user.photoURL ?? null,
    sharedId: source?.sharedId ?? null,
    sourceTitle: source?.title ?? null,
    aiAnswer: null,
    aiStatus: source ? 'pending' : 'none',
    createdAt: serverTimestamp(),
  })
}

export const postReply = (gid: string, did: string, user: User, text: string) =>
  addDoc(repliesCol(gid, did), { text, authorId: user.uid, authorName: displayName(user), authorPhoto: user.photoURL ?? null, createdAt: serverTimestamp() })

/* ---------------- Focus room ---------------- */

export interface FocusState {
  phase: 'idle' | 'focus' | 'break'
  startedAt: number | null
  durationMs: number
  pausedRemainingMs?: number | null
  startedBy?: string
}

export const setFocus = (gid: string, s: FocusState) => setDoc(focusRef(gid), s)
export const setPresence = (gid: string, uid: string, focusing: boolean) =>
  setDoc(doc(membersCol(gid), uid), { focusing, focusSince: focusing ? Date.now() : null }, { merge: true })
