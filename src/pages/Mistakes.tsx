import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { BookX, Check, Eye, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { db, type Mistake } from '@/lib/db'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { EmptyState } from '@/components/EmptyState'
import { PageBadge } from '@/components/DocViewer'
import { awardXp, recordAttempt } from '@/lib/progress'
import { cn, relativeTime, shuffle } from '@/lib/utils'

const SOURCE_LABEL: Record<Mistake['source'], string> = { mcq: 'MCQ', flashcard: 'Flashcard', boss: 'Boss battle', voice: 'Voice quiz' }

export default function Mistakes() {
  const [filter, setFilter] = useState<'open' | 'resolved'>('open')
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('createdAt').reverse().toArray(), [])
  const docs = useLiveQuery(() => db.documents.toArray(), [])
  const [revise, setRevise] = useState<Mistake[] | null>(null)

  const shown = useMemo(() => (mistakes ?? []).filter((m) => (filter === 'open' ? !m.resolved : m.resolved)), [mistakes, filter])
  const byDoc = useMemo(() => {
    const map = new Map<string, Mistake[]>()
    for (const m of shown) map.set(m.docId, [...(map.get(m.docId) ?? []), m])
    return [...map.entries()]
  }, [shown])
  const title = (id: string) => docs?.find((d) => d.id === id)?.title ?? 'Deleted chapter'
  const openCount = (mistakes ?? []).filter((m) => !m.resolved).length

  if (revise) return <ReviseSession list={revise} onExit={() => setRevise(null)} />

  return (
    <div>
      <PageHeader
        title="Mistakes"
        subtitle="Every wrong MCQ, flashcard and boss answer lands here automatically — with the explanation."
        actions={
          <Button variant="coral" size="lg" disabled={!openCount} onClick={() => setRevise(shuffle((mistakes ?? []).filter((m) => !m.resolved)))}>
            <RotateCcw /> Revise mistakes {openCount ? `(${openCount})` : ''}
          </Button>
        }
      />
      <Segmented
        className="mb-6 max-w-sm"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: `To revise (${openCount})` },
          { value: 'resolved', label: 'Mastered' },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          icon={filter === 'open' ? <Sparkles /> : <BookX />}
          title={filter === 'open' ? 'No mistakes to revise 🎉' : 'Nothing mastered yet'}
          desc={filter === 'open' ? 'Take an MCQ test or review flashcards — anything you get wrong will show up here.' : 'Revise your mistakes to master them.'}
        />
      ) : (
        <div className="space-y-8">
          {byDoc.map(([docId, list]) => (
            <div key={docId}>
              <p className="section-label mb-3">{title(docId)}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {list.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="surface p-5">
                    <div className="flex items-center gap-2">
                      <span className="chip-muted">{SOURCE_LABEL[m.source]}</span>
                      {m.topic && <span className="chip-muted">{m.topic}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{relativeTime(m.createdAt)}</span>
                    </div>
                    <p className="mt-3 font-semibold leading-relaxed">{m.question}</p>
                    {m.yourAnswer && <p className="mt-2 text-sm text-coral line-through decoration-coral/60">{m.yourAnswer}</p>}
                    <p className="mt-1 text-sm text-success">✓ {m.correctAnswer}</p>
                    {m.explanation && <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">{m.explanation}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <PageBadge page={m.page} docId={m.docId} />
                      <div className="flex gap-1">
                        {!m.resolved && (
                          <Button size="sm" variant="ghost" onClick={() => db.mistakes.update(m.id!, { resolved: 1 })}>
                            <Check /> Mastered
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => db.mistakes.delete(m.id!)} aria-label="Delete">
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviseSession({ list, onExit }: { list: Mistake[]; onExit: () => void }) {
  const [i, setI] = useState(0)
  const [show, setShow] = useState(false)
  const [got, setGot] = useState(0)
  const m = list[i]

  const answer = async (ok: boolean) => {
    if (ok) {
      await db.mistakes.update(m.id!, { resolved: 1 })
      setGot((g) => g + 1)
    }
    setShow(false)
    if (i + 1 >= list.length) {
      const total = got + (ok ? 1 : 0)
      await recordAttempt({ docId: m.docId, kind: 'revise', correct: total, total: list.length })
      await awardXp(total * 5 + 5, 'Revised mistakes')
      if (total === list.length) confetti({ particleCount: 120, spread: 80 })
    }
    setI(i + 1)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-5xl">Revision</h1>
        <Button variant="ghost" onClick={onExit}>
          <X /> Exit
        </Button>
      </div>
      <AnimatePresence mode="wait">
        {m ? (
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="surface p-8">
            <p className="section-label">
              {i + 1} / {list.length}
            </p>
            <p className="mt-3 text-2xl font-semibold leading-relaxed">{m.question}</p>
            {show ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
                <p className="rounded-2xl bg-success/15 p-4 text-success">✓ {m.correctAnswer}</p>
                {m.explanation && <p className="text-sm text-muted-foreground">{m.explanation}</p>}
                <PageBadge page={m.page} docId={m.docId} />
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <Button variant="secondary" size="lg" onClick={() => answer(false)}>
                    Still learning
                  </Button>
                  <Button variant="coral" size="lg" onClick={() => answer(true)}>
                    <Check /> I got it
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Button className="mt-8 w-full" size="lg" onClick={() => setShow(true)}>
                <Eye /> Think, then reveal
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn('surface p-10 text-center')}>
            <p className="font-serif text-7xl">
              {got}/{list.length}
            </p>
            <p className="mt-2 text-muted-foreground">mistakes mastered this round</p>
            <Button className="mt-6" variant="coral" onClick={onExit}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
