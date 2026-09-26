/**
 * Right after a chapter is added, prepare the main study content in the background (one request at a time),
 * so each tab is already saved by the time the student opens it — and a refresh never loses work in progress.
 * Opening a tab while its content is still being prepared simply joins the same request.
 */
import { generate } from './aiClient'
import { db } from './db'
import { getSettings } from './settings'
import { P } from './params'
import { avoidFor } from './questions'
import { newCardFields } from './sm2'
import { uid } from './utils'

const started = new Set<string>()

export function pregenerate(docId: string) {
  if (started.has(docId)) return
  started.add(docId)
  void (async () => {
    const s = getSettings()
    const steps: (() => Promise<unknown>)[] = [
      () => generate('explain', { docId, params: P.explain(s) }),
      () => generate('summary', { docId, params: P.summary(s) }),
      async () => {
        const d = await generate('flashcards', { docId, params: P.flashcards(s) })
        if ((await db.cards.where('docId').equals(docId).count()) === 0)
          await db.cards.bulkAdd(d.cards.map((c) => ({ id: uid(), docId, front: c.front, back: c.back, page: c.page, ...newCardFields() })))
      },
      async () => generate('mcqs', { docId, params: P.mcqs(s, 'test'), extra: await avoidFor(docId, s, 'test') }),
      () => generate('mindmap', { docId, params: P.mindmap(s) }),
      () => generate('experiment', { docId, params: P.experiment(s) }),
      async () => generate('mcqs', { docId, params: P.mcqs(s, 'boss'), extra: await avoidFor(docId, s, 'boss') }),
    ]
    for (const step of steps) {
      try {
        await step()
      } catch {
        // offline / quota — the tab will offer a retry when opened
      }
    }
  })()
}
