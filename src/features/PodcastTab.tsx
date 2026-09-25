import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Headphones, Pause, Play, RefreshCw, RotateCcw } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { TeacherAvatar } from '@/components/TeacherAvatar'
import { Button } from '@/components/ui/button'
import { SpeechQueue, loadVoices, pickVoices, langCode, ttsSupported } from '@/lib/speech'
import { cn } from '@/lib/utils'

const HOSTS = {
  A: { name: 'Ayesha', variant: 'host-a' as const, pitch: 1.2 },
  B: { name: 'Bilal', variant: 'host-b' as const, pitch: 0.85 },
}

export function PodcastTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const ai = useAiTask('podcast', doc.id, P.podcast(s), { auto: true })
  const [index, setIndex] = useState(-1)
  const [state, setState] = useState<'playing' | 'paused' | 'stopped'>('stopped')
  const [pulse, setPulse] = useState(0)
  const [rate, setRate] = useState(1)
  const queue = useRef<SpeechQueue | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lines = useMemo(() => ai.data?.lines ?? [], [ai.data])

  useEffect(() => {
    if (!lines.length) return
    const q = new SpeechQueue({ onIndex: setIndex, onState: setState, onBoundary: () => setPulse((p) => p + 1) })
    queue.current = q
    loadVoices().then(() => {
      const voices = pickVoices(s.language, 2)
      q.load(
        lines.map((l) => {
          const host = l.speaker.toUpperCase().startsWith('B') ? 'B' : 'A'
          // two different voices when available, otherwise the same voice at different pitches
          return { text: l.text, voice: voices[host === 'A' ? 0 : Math.min(1, voices.length - 1)], pitch: HOSTS[host].pitch, lang: langCode(s.language) }
        }),
      )
    })
    return () => q.stop()
  }, [lines, s.language])

  useEffect(() => {
    listRef.current?.querySelector(`[data-line="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [index])

  const speaker = index >= 0 ? (lines[index]?.speaker.toUpperCase().startsWith('B') ? 'B' : 'A') : null
  const visible = state === 'stopped' && index < 0 ? lines : lines.slice(0, Math.max(index + 1, 1))

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Booking two AI hosts…', 'Writing jokes about Newton…', 'Setting up the microphones…']}>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="surface h-fit p-6 lg:sticky lg:top-6">
          <span className="chip-coral">
            <Headphones className="h-3 w-3" /> Podcast mode
          </span>
          <h2 className="mt-3 text-3xl leading-tight">{ai.data?.title}</h2>
          <div className="mt-6 flex justify-center gap-6">
            {(['A', 'B'] as const).map((h) => (
              <div key={h} className="flex flex-col items-center gap-2">
                <TeacherAvatar variant={HOSTS[h].variant} speaking={state === 'playing' && speaker === h} pulse={pulse} size={96} />
                <span className={cn('text-sm font-semibold', speaker === h && state === 'playing' ? 'text-coral' : 'text-muted-foreground')}>{HOSTS[h].name}</span>
              </div>
            ))}
          </div>
          {!ttsSupported() && <p className="mt-4 text-center text-xs text-coral">Your browser doesn't support speech — you can still read the script.</p>}
          <div className="mt-6 flex items-center justify-center gap-3">
            {state === 'playing' ? (
              <Button size="lg" variant="coral" onClick={() => queue.current?.pause()}>
                <Pause /> Pause
              </Button>
            ) : (
              <Button size="lg" variant="coral" onClick={() => (state === 'paused' ? queue.current?.resume() : queue.current?.play(0))}>
                <Play /> {state === 'paused' ? 'Resume' : 'Play episode'}
              </Button>
            )}
            {state !== 'stopped' && (
              <Button
                size="icon"
                variant="secondary"
                onClick={() => {
                  queue.current?.stop()
                  setIndex(-1)
                }}
              >
                <RotateCcw />
              </Button>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-1 rounded-full bg-secondary p-1">
            {[0.9, 1, 1.2, 1.4].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRate(r)
                  queue.current?.setRate(r)
                }}
                className={cn('flex-1 rounded-full py-1 text-xs font-semibold', rate === r ? 'bg-background' : 'text-muted-foreground')}
              >
                {r}×
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => ai.regenerate()}>
            <RefreshCw /> New episode
          </Button>
        </div>

        <div ref={listRef} className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((l, i) => {
              const host = l.speaker.toUpperCase().startsWith('B') ? 'B' : 'A'
              const active = i === index
              return (
                <motion.div
                  key={i}
                  data-line={i}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  className={cn('flex items-end gap-3', host === 'B' && 'flex-row-reverse')}
                >
                  <TeacherAvatar variant={HOSTS[host].variant} speaking={false} size={36} />
                  <div
                    onClick={() => queue.current?.play(i)}
                    className={cn(
                      'max-w-[80%] cursor-pointer rounded-3xl px-5 py-3 text-[15px] leading-relaxed transition',
                      host === 'A' ? 'rounded-bl-md bg-plum' : 'rounded-br-md bg-moss',
                      active && 'ring-2 ring-coral',
                      s.language === 'ur' && 'urdu',
                    )}
                  >
                    <p className="mb-0.5 text-xs font-semibold text-foreground/60">{HOSTS[host].name}</p>
                    {l.text}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {state === 'playing' && index < lines.length - 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 px-14">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="h-2 w-2 rounded-full bg-muted-foreground" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d * 0.15 }} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </AsyncState>
  )
}
