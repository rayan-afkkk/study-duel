/**
 * Local-first study data in IndexedDB (Dexie). Firebase is used ONLY for auth + group features.
 */
import Dexie, { type EntityTable } from 'dexie'

export type DocKind = 'pdf' | 'text' | 'image'

export interface StudyDoc {
  id: string
  title: string
  kind: DocKind
  createdAt: number
  pageCount: number
  pdf?: Blob
  isDemo?: boolean
  subject?: string
  color: number
}

export interface Chunk {
  id?: number
  docId: string
  page: number
  text: string
  image?: Blob
}

export interface CacheEntry {
  key: string
  task: string
  docId: string
  createdAt: number
  data: unknown
}

export interface Card {
  id: string
  docId: string
  front: string
  back: string
  page?: number | null
  ease: number
  interval: number
  reps: number
  lapses: number
  due: number
  lastReviewed?: number
}

export type AttemptKind = 'mcq' | 'flashcard' | 'boss' | 'voice' | 'battle' | 'explainBack' | 'revise'

export interface Attempt {
  id?: number
  docId: string
  kind: AttemptKind
  correct: number
  total: number
  topic?: string
  createdAt: number
}

export interface Mistake {
  id?: number
  docId: string
  source: 'mcq' | 'flashcard' | 'boss' | 'voice'
  question: string
  correctAnswer: string
  yourAnswer?: string
  explanation?: string
  page?: number | null
  topic?: string
  createdAt: number
  resolved: 0 | 1
}

export interface PlanEntry {
  docId: string
  examDate: string
  prevPercent: number
  dailyMinutes: number
  data: import('@shared/schemas').StudyPlanData
  done: string[]
  createdAt: number
}

export interface XpEvent {
  id?: number
  amount: number
  reason: string
  createdAt: number
}

export interface Meta {
  key: string
  value: unknown
}

export const db = new Dexie('studyduel') as Dexie & {
  documents: EntityTable<StudyDoc, 'id'>
  chunks: EntityTable<Chunk, 'id'>
  aiCache: EntityTable<CacheEntry, 'key'>
  cards: EntityTable<Card, 'id'>
  attempts: EntityTable<Attempt, 'id'>
  mistakes: EntityTable<Mistake, 'id'>
  plans: EntityTable<PlanEntry, 'docId'>
  xp: EntityTable<XpEvent, 'id'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  documents: 'id, createdAt',
  chunks: '++id, docId, [docId+page]',
  aiCache: 'key, docId, task',
  cards: 'id, docId, due',
  attempts: '++id, docId, kind, createdAt',
  mistakes: '++id, docId, resolved, createdAt',
  plans: 'docId',
  xp: '++id, createdAt',
  meta: 'key',
})

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key)
  return (row?.value as T) ?? fallback
}
export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value })

export async function deleteDocument(id: string) {
  await db.transaction('rw', [db.documents, db.chunks, db.aiCache, db.cards, db.attempts, db.mistakes, db.plans], async () => {
    await db.documents.delete(id)
    await db.chunks.where('docId').equals(id).delete()
    await db.aiCache.where('docId').equals(id).delete()
    await db.cards.where('docId').equals(id).delete()
    await db.attempts.where('docId').equals(id).delete()
    await db.mistakes.where('docId').equals(id).delete()
    await db.plans.delete(id)
  })
}

/** Document text with [Page N] markers — the context sent to the AI. */
export async function getDocContext(docId: string) {
  const chunks = await db.chunks.where('docId').equals(docId).sortBy('page')
  let out = ''
  let last = -1
  for (const c of chunks) {
    if (c.page !== last) {
      out += `\n\n[Page ${c.page}]\n`
      last = c.page
    }
    out += c.text + '\n'
  }
  return out.trim()
}

export async function getPages(docId: string) {
  const chunks = await db.chunks.where('docId').equals(docId).sortBy('page')
  const map = new Map<number, { page: number; text: string; image?: Blob }>()
  for (const c of chunks) {
    const p = map.get(c.page) ?? { page: c.page, text: '' }
    p.text += (p.text ? '\n' : '') + c.text
    if (c.image) p.image = c.image
    map.set(c.page, p)
  }
  return [...map.values()]
}
