import { db, type Mistake } from './db'

/** Save a wrong answer to the mistake notebook (deduped by question while unresolved). */
export async function addMistake(m: Omit<Mistake, 'id' | 'createdAt' | 'resolved'>) {
  const existing = await db.mistakes.where('docId').equals(m.docId).filter((x) => x.question === m.question && !x.resolved).first()
  if (existing) {
    await db.mistakes.update(existing.id!, { yourAnswer: m.yourAnswer, createdAt: Date.now() })
    return
  }
  await db.mistakes.add({ ...m, createdAt: Date.now(), resolved: 0 })
}
