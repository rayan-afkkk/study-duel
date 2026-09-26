/** Separate, non-overlapping question sets for the MCQ test, boss battle, voice quiz and live battle. */
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings, type Settings } from './settings'
import { P, type McqVariant } from './params'
import { getCached } from './aiClient'
import { db } from './db'

const VARIANTS: McqVariant[] = ['test', 'boss', 'voice', 'battle']

/** Question stems already used elsewhere for this chapter, so the AI asks about different things. */
export async function avoidFor(docId: string, s: Pick<Settings, 'language' | 'difficulty' | 'mode'>, variant: McqVariant) {
  const stems: string[] = []
  for (const v of VARIANTS) {
    if (v === variant) continue
    const set = await getCached('mcqs', docId, P.mcqs(s, v))
    set?.questions.forEach((q) => stems.push(q.question))
  }
  const cards = await db.cards.where('docId').equals(docId).toArray()
  cards.slice(0, 20).forEach((c) => stems.push(c.front))
  return { avoid: stems.slice(0, 40), variant }
}

export function useMcqSet(docId: string, variant: McqVariant) {
  const s = useSettings()
  return useAiTask('mcqs', docId, P.mcqs(s, variant), { auto: true, extraAsync: () => avoidFor(docId, s, variant) })
}
