import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Layers, RefreshCw, RotateCcw, Shuffle } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { StudyDoc } from '@/lib/db'
import { db } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Progress } from '@/components/ui/progress'
import { nextIntervalLabel, newCardFields, review, type Grade } from '@/lib/sm2'
import { addMistake } from '@/lib/mistakes'
import { awardXp, recordAttempt } from '@/lib/progress'
import { sfx } from '@/lib/sfx'
import { cn, isUrduScript, shuffle, uid } from '@/lib/utils'
import type { FlashcardsData } from '@shared/schemas'
import { generate } from '@/lib/aiClient'
import { toast } from 'sonner'

async function syncCards(docId: string, data: FlashcardsData, replace = false) {
  const count = await db.cards.where('docId').equals(docId).count()
  if (count > 0 && !replace) return
  if (replace) await db.cards.where('docId').equals(docId).delete()
  await db.cards.bulkAdd(data.cards.map((c) => ({ id: uid(), docId, front: c.front, back: c.back, page: c.page, ...newCardFields() })))
}

export function FlashcardsTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const cards = useLiveQuery(() => db.cards.where('docId').equals(doc.id).toArray(), [doc.id])
  const hasCards = (cards?.length ?? 0) > 0
  const ai = useAiTask('flashcards', doc.id, P.flashcards(s), {
    auto: cards !== undefined && !hasCards,
    onData: (d) => syncCards(doc.id, d),
  })
  const [mode, setMode] = useState<'due' | 'all'>('due')
  const [queue, setQueue] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [session, setSession] = useState({ reviewed: 0, again: 0 })

  const dueIds = useMemo(() => (cards ?? []).filter((c) => c.due <= Date.now()).map((c) => c.id), [cards])

  const idsKey = useMemo(() => (cards ?? []).map((c) => c.id).join(','), [cards])
  // Build the queue when the deck changes or mode changes (not on every review).
  useEffect(() => {
    if (!cards) return
    setQueue(mode === 'due' ? dueIds : shuffle(cards.map((c) => c.id)))
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, idsKey])

  const current = cards?.find((c) => c.id === queue[0])

  const grade = async (g: Grade) => {
    if (!current) return
    sfx.click()
    const updated = review(current, g)
    await db.cards.put(updated)
    await recordAttempt({ docId: doc.id, kind: 'flashcard', correct: g === 'again' ? 0 : 1, total: 1 })
    await awardXp(2, 'Flashcard review')
    if (g === 'again') {
      await addMistake({ docId: doc.id, source: 'flashcard', question: current.front, correctAnswer: current.back, page: current.page })
    }
    setSession((x) => ({ reviewed: x.reviewed + 1, again: x.again + (g === 'again' ? 1 : 0) }))
    setFlipped(false)
    setQueue((q) => {
      const rest = q.slice(1)
      // "Again" cards come back later in this session
      return g === 'again' ? [...rest.slice(0, 3), current.id, ...rest.slice(3)] : rest
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
        sfx.flip()
      } else if (flipped && e.key === '1') grade('again')
      else if (flipped && e.key === '2') grade('hard')
      else if (flipped && e.key === '3') grade('easy')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (queue.length === 0 && session.reviewed > 0) confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#EE6A4F', '#E6B54A', '#F4EDE1'] })
  }, [queue.length, session.reviewed])

  if (!hasCards)
    return (
      <AsyncState status={ai.status === 'success' ? 'loading' : ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Writing flashcards…', 'Picking the most testable facts…', 'Shuffling the deck…']}>
        {null}
      </AsyncState>
    )

  const total = session.reviewed + queue.length
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          className="sm:w-80"
          size="sm"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setSession({ reviewed: 0, again: 0 })
          }}
          options={[
            { value: 'due', label: `Due (${dueIds.length})` },
            { value: 'all', label: `All (${cards?.length ?? 0})`, icon: <Shuffle /> },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!confirm('Replace this deck with a fresh AI-generated deck? Your review history for these cards will be reset.')) return
            try {
              const d = await generate('flashcards', { docId: doc.id, params: P.flashcards(s), force: true })
              await syncCards(doc.id, d, true)
              setSession({ reviewed: 0, again: 0 })
              toast.success('Fresh deck ready!')
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        >
          <RefreshCw /> New deck
        </Button>
      </div>

      {total > 0 && <Progress value={(session.reviewed / Math.max(1, total)) * 100} className="mb-6" indicatorClassName="bg-coral" />}

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.id + session.reviewed} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <div
              className="perspective cursor-pointer"
              onClick={() => {
                setFlipped(!flipped)
                sfx.flip()
              }}
            >
              <motion.div className="preserve-3d relative h-[340px] md:h-[380px]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
                <div className="backface-hidden absolute inset-0 flex flex-col rounded-4xl border bg-ocean p-8">
                  <div className="flex items-center justify-between">
                    <span className="chip bg-background/30 text-foreground/80">
                      <Layers className="h-3 w-3" /> Question
                    </span>
                    <PageBadge page={current.page} docId={doc.id} />
                  </div>
                  <p className={cn('m-auto text-center font-serif text-3xl leading-snug md:text-4xl', isUrduScript(current.front) && 'urdu')}>{current.front}</p>
                  <p className="text-center text-xs text-foreground/50">Tap or press Space to flip</p>
                </div>
                <div className="backface-hidden absolute inset-0 flex flex-col rounded-4xl border bg-card p-8 [transform:rotateY(180deg)]">
                  <span className="chip-coral w-fit">Answer</span>
                  <p className={cn('m-auto text-center text-xl leading-relaxed md:text-2xl', isUrduScript(current.back) && 'urdu')}>{current.back}</p>
                </div>
              </motion.div>
            </div>

            <div className={cn('mt-6 grid grid-cols-3 gap-3 transition-opacity', flipped ? 'opacity-100' : 'pointer-events-none opacity-30')}>
              {(
                [
                  ['again', 'Again', 'bg-coral-soft text-coral', '1'],
                  ['hard', 'Hard', 'bg-gold-soft text-gold', '2'],
                  ['easy', 'Easy', 'bg-success/15 text-success', '3'],
                ] as const
              ).map(([g, label, cls, key]) => (
                <button key={g} onClick={() => grade(g)} className={cn('rounded-3xl py-4 font-semibold transition hover:brightness-125 active:scale-95', cls)}>
                  {label}
                  <span className="block text-xs font-normal opacity-70">
                    {nextIntervalLabel(current, g)} · key {key}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="surface flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <h3 className="text-4xl">{session.reviewed ? 'Deck complete!' : 'Nothing due right now'}</h3>
            <p className="text-muted-foreground">
              {session.reviewed
                ? `You reviewed ${session.reviewed} cards (${session.again} to relearn). SM-2 will bring them back at the perfect time.`
                : 'All caught up — come back later, or practise the whole deck.'}
            </p>
            <Button
              variant="coral"
              onClick={() => {
                setMode('all')
                setQueue(shuffle((cards ?? []).map((c) => c.id)))
                setSession({ reviewed: 0, again: 0 })
              }}
            >
              <RotateCcw /> Practise all cards
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { syncCards }
