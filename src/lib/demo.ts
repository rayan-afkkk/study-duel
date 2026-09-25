/** "Load demo data" — inserts a full sample chapter with all AI content, no API calls. */
import { db } from './db'
import { chunkPage } from './ingest'
import { putCached } from './aiClient'
import { DEFAULT_SETTINGS as D, P } from './params'
import { newCardFields } from './sm2'
import { uid } from './utils'
import {
  DEMO_EXPLAIN,
  DEMO_FLASHCARDS,
  DEMO_MCQS,
  DEMO_MINDMAP,
  DEMO_PAGES,
  DEMO_PAPERS,
  DEMO_PODCAST,
  DEMO_SUMMARY,
  DEMO_TITLE,
} from './demoContent'
import { PROGRESS_EVENT } from './progress'
import { todayISO } from './utils'

export const DEMO_ID = 'demo-force-motion'

export async function loadDemoData() {
  const existing = await db.documents.get(DEMO_ID)
  if (existing) return DEMO_ID

  await db.transaction('rw', [db.documents, db.chunks, db.aiCache, db.cards, db.attempts, db.xp, db.mistakes, db.meta], async () => {
    await db.documents.add({
      id: DEMO_ID,
      title: DEMO_TITLE,
      kind: 'text',
      createdAt: Date.now(),
      pageCount: DEMO_PAGES.length,
      isDemo: true,
      subject: 'Physics',
      color: 0,
    })
    await db.chunks.bulkAdd(DEMO_PAGES.flatMap((t, i) => chunkPage(DEMO_ID, i + 1, t)))

    await putCached('explain', DEMO_ID, P.explain(D), DEMO_EXPLAIN)
    await putCached('summary', DEMO_ID, P.summary(D), DEMO_SUMMARY)
    await putCached('flashcards', DEMO_ID, P.flashcards(D), DEMO_FLASHCARDS)
    await putCached('mcqs', DEMO_ID, P.mcqs(D), DEMO_MCQS)
    await putCached('mindmap', DEMO_ID, P.mindmap(D), DEMO_MINDMAP)
    await putCached('podcast', DEMO_ID, P.podcast(D), DEMO_PODCAST)
    for (const [board, paper] of Object.entries(DEMO_PAPERS)) {
      await putCached('guessPaper', DEMO_ID, P.guessPaper(D, board, { mcqCount: 10, shortCount: 6, longCount: 3 }), paper)
    }
    await putCached('pickSimulation', DEMO_ID, P.pickSimulation(), {
      simulationId: 'incline',
      reason: 'The chapter is about forces, F = ma and friction — the inclined-plane lab shows all three.',
    })

    await db.cards.bulkAdd(DEMO_FLASHCARDS.cards.map((c) => ({ id: uid(), docId: DEMO_ID, ...c, ...newCardFields() })))

    // A little sample practice history so charts & the readiness gauge have something to show.
    const day = 86400000
    const now = Date.now()
    const history = [
      { d: 5, correct: 5, total: 10, xp: 40 },
      { d: 3, correct: 6, total: 10, xp: 55 },
      { d: 2, correct: 7, total: 10, xp: 60 },
      { d: 1, correct: 8, total: 10, xp: 75 },
    ]
    for (const h of history) {
      await db.attempts.add({ docId: DEMO_ID, kind: 'mcq', correct: h.correct, total: h.total, createdAt: now - h.d * day })
      await db.xp.add({ amount: h.xp, reason: 'Demo practice', createdAt: now - h.d * day })
    }
    await db.mistakes.bulkAdd([
      {
        docId: DEMO_ID,
        source: 'mcq',
        question: 'A 20 N force acts on a 4 kg box. Its acceleration is:',
        correctAnswer: '5 m/s²',
        yourAnswer: '80 m/s²',
        explanation: 'a = F/m = 20/4 = 5 m/s². A common mistake is multiplying instead of dividing.',
        page: 3,
        topic: "Newton's second law",
        createdAt: now - 2 * day,
        resolved: 0,
      },
      {
        docId: DEMO_ID,
        source: 'mcq',
        question: 'The SI unit of momentum is:',
        correctAnswer: 'kg m/s',
        yourAnswer: 'kg m/s²',
        explanation: 'p = mv, so the unit is kg m/s. kg m/s² is the newton.',
        page: 5,
        topic: 'Momentum',
        createdAt: now - day,
        resolved: 0,
      },
    ])
    const yesterday = new Date(now - day)
    await db.meta.put({ key: 'streak', value: 2 })
    await db.meta.put({ key: 'bestStreak', value: 2 })
    await db.meta.put({ key: 'lastStudyDate', value: todayISO(yesterday) })
  })
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT))
  return DEMO_ID
}
