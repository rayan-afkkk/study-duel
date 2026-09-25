/** XP, streaks, badges, weekly stats and the exam readiness score — all computed from IndexedDB. */
import { db, getMeta, setMeta, type Attempt } from './db'
import { todayISO, daysBetween } from './utils'

export const PROGRESS_EVENT = 'sd-progress'

export async function awardXp(amount: number, reason: string) {
  if (amount <= 0) return
  await db.xp.add({ amount, reason, createdAt: Date.now() })
  await touchStreak()
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
}

async function touchStreak() {
  const today = todayISO()
  const last = await getMeta<string>('lastStudyDate', '')
  let streak = await getMeta<number>('streak', 0)
  if (last === today) return
  streak = last && daysBetween(last, today) === 1 ? streak + 1 : 1
  await setMeta('streak', streak)
  await setMeta('bestStreak', Math.max(streak, await getMeta<number>('bestStreak', 0)))
  await setMeta('lastStudyDate', today)
}

export async function recordAttempt(a: Omit<Attempt, 'createdAt'>) {
  await db.attempts.add({ ...a, createdAt: Date.now() })
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
}

export async function incMeta(key: string, by = 1) {
  await setMeta(key, (await getMeta<number>(key, 0)) + by)
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}

export interface Stats {
  totalXp: number
  weeklyXp: number
  level: number
  levelProgress: number
  streak: number
  bestStreak: number
  mcqAccuracy: number | null
  weeklyAccuracy: number | null
  cardsReviewed: number
  weeklyCards: number
  bossWins: number
  battlesWon: number
  focusMinutes: number
  docs: number
  mistakesOpen: number
  dailyXp: { day: string; xp: number }[]
  badges: string[]
}

const QUIZ_KINDS = ['mcq', 'boss', 'voice', 'battle', 'revise'] as const

export async function getStats(): Promise<Stats> {
  const weekStart = startOfWeek()
  const [xpRows, attempts, docs, mistakesOpen] = await Promise.all([
    db.xp.toArray(),
    db.attempts.toArray(),
    db.documents.count(),
    db.mistakes.where('resolved').equals(0).count(),
  ])
  const totalXp = xpRows.reduce((s, r) => s + r.amount, 0)
  const weeklyXp = xpRows.filter((r) => r.createdAt >= weekStart).reduce((s, r) => s + r.amount, 0)
  const quiz = attempts.filter((a) => (QUIZ_KINDS as readonly string[]).includes(a.kind))
  const acc = (list: Attempt[]) => {
    const t = list.reduce((s, a) => s + a.total, 0)
    return t ? Math.round((list.reduce((s, a) => s + a.correct, 0) / t) * 100) : null
  }
  const cardAttempts = attempts.filter((a) => a.kind === 'flashcard')
  const cardsReviewed = cardAttempts.reduce((s, a) => s + a.total, 0)
  const weeklyCards = cardAttempts.filter((a) => a.createdAt >= weekStart).reduce((s, a) => s + a.total, 0)

  const dailyXp: Stats['dailyXp'] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayISO(d)
    dailyXp.push({
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      xp: xpRows.filter((r) => todayISO(new Date(r.createdAt)) === key).reduce((s, r) => s + r.amount, 0),
    })
  }

  // streak resets if you missed yesterday
  let streak = await getMeta<number>('streak', 0)
  const last = await getMeta<string>('lastStudyDate', '')
  if (last && daysBetween(last, todayISO()) > 1) streak = 0

  const level = Math.floor(Math.sqrt(totalXp / 50)) + 1
  const curBase = (level - 1) ** 2 * 50
  const nextBase = level ** 2 * 50
  const stats: Stats = {
    totalXp,
    weeklyXp,
    level,
    levelProgress: (totalXp - curBase) / (nextBase - curBase),
    streak,
    bestStreak: await getMeta<number>('bestStreak', 0),
    mcqAccuracy: acc(quiz),
    weeklyAccuracy: acc(quiz.filter((a) => a.createdAt >= weekStart)),
    cardsReviewed,
    weeklyCards,
    bossWins: await getMeta<number>('bossWins', 0),
    battlesWon: await getMeta<number>('battlesWon', 0),
    focusMinutes: await getMeta<number>('focusMinutes', 0),
    docs,
    mistakesOpen,
    dailyXp,
    badges: [],
  }
  stats.badges = BADGES.filter((b) => b.test(stats, attempts)).map((b) => b.id)
  return stats
}

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  desc: string
  test: (s: Stats, a: Attempt[]) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First Steps', emoji: '🌱', desc: 'Add your first chapter', test: (s) => s.docs > 0 },
  { id: 'on-fire', name: 'On Fire', emoji: '🔥', desc: '3-day study streak', test: (s) => s.bestStreak >= 3 },
  { id: 'card-shark', name: 'Card Shark', emoji: '🃏', desc: 'Review 50 flashcards', test: (s) => s.cardsReviewed >= 50 },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    emoji: '🎯',
    desc: 'Score 100% on an MCQ test (5+ questions)',
    test: (_s, a) => a.some((x) => x.kind === 'mcq' && x.total >= 5 && x.correct === x.total),
  },
  { id: 'boss-slayer', name: 'Boss Slayer', emoji: '🐉', desc: 'Defeat a chapter boss', test: (s) => s.bossWins > 0 },
  { id: 'duelist', name: 'Duelist', emoji: '⚔️', desc: 'Win a live battle', test: (s) => s.battlesWon > 0 },
  { id: 'deep-focus', name: 'Deep Focus', emoji: '🧘', desc: '100 focus minutes', test: (s) => s.focusMinutes >= 100 },
  { id: 'scholar', name: 'Scholar', emoji: '🎓', desc: 'Reach level 5', test: (s) => s.level >= 5 },
]

/**
 * "If you took the exam today you'd score ~X%".
 * Blend of recent quiz accuracy (recency-weighted), flashcard retention and practice coverage.
 */
export async function readiness(docId?: string): Promise<{ score: number | null; parts: { label: string; value: number | null }[] }> {
  const attempts = (docId ? await db.attempts.where('docId').equals(docId).toArray() : await db.attempts.toArray()).sort(
    (a, b) => b.createdAt - a.createdAt,
  )
  const quiz = attempts.filter((a) => (QUIZ_KINDS as readonly string[]).includes(a.kind) && a.total > 0).slice(0, 12)
  let mcq: number | null = null
  if (quiz.length) {
    let w = 0
    let s = 0
    quiz.forEach((a, i) => {
      const weight = Math.pow(0.85, i) * a.total
      s += (a.correct / a.total) * weight
      w += weight
    })
    mcq = s / w
  }
  const cards = docId ? await db.cards.where('docId').equals(docId).toArray() : await db.cards.toArray()
  const reviewed = cards.filter((c) => c.reps > 0 || c.lapses > 0)
  let retention: number | null = null
  if (reviewed.length) {
    const r = reviewed.reduce((s, c) => s + c.reps / (c.reps + c.lapses || 1), 0) / reviewed.length
    const coverage = cards.length ? reviewed.length / cards.length : 0
    retention = r * (0.6 + 0.4 * coverage)
  }
  const practice = Math.min(1, attempts.length / 8)
  if (mcq === null && retention === null) return { score: null, parts: [] }
  let score: number
  if (mcq !== null && retention !== null) score = mcq * 0.6 + retention * 0.25 + practice * 0.15
  else if (mcq !== null) score = mcq * 0.8 + practice * 0.2
  else score = retention! * 0.75 + practice * 0.25
  return {
    score: Math.round(Math.min(99, Math.max(5, score * 100))),
    parts: [
      { label: 'Quiz accuracy', value: mcq === null ? null : Math.round(mcq * 100) },
      { label: 'Flashcard memory', value: retention === null ? null : Math.round(retention * 100) },
      { label: 'Practice volume', value: Math.round(practice * 100) },
    ],
  }
}

/** Weak topics = topics with the most unresolved mistakes / lowest accuracy. */
export async function weakTopics(docId: string): Promise<string[]> {
  const mistakes = await db.mistakes.where('docId').equals(docId).toArray()
  const counts = new Map<string, number>()
  for (const m of mistakes) if (m.topic) counts.set(m.topic, (counts.get(m.topic) ?? 0) + (m.resolved ? 0.5 : 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 5)
}
