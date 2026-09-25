import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Mic, Play, SkipForward, Volume2, XCircle } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import type { Mcq } from '@shared/schemas'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { Button } from '@/components/ui/button'
import { TeacherAvatar } from '@/components/TeacherAvatar'
import { listen, speakOnce, sttSupported, ttsSupported } from '@/lib/speech'
import { addMistake } from '@/lib/mistakes'
import { awardXp, recordAttempt } from '@/lib/progress'
import { sfx } from '@/lib/sfx'
import { cn, letter, shuffle } from '@/lib/utils'

/** Map a spoken answer to an option index: "B", "option b", "bee", or words from the option text. */
export function matchSpoken(said: string, options: string[]): number | null {
  const t = ` ${said.toLowerCase().replace(/[^a-z0-9؀-ۿ ]/g, ' ')} `
  const letters: [RegExp, number][] = [
    [/\b(option|answer|letter)?\s*(a|ay|eh|hey)\b/, 0],
    [/\b(option|answer|letter)?\s*(b|be|bee)\b/, 1],
    [/\b(option|answer|letter)?\s*(c|see|sea|si)\b/, 2],
    [/\b(option|answer|letter)?\s*(d|dee|the)\b/, 3],
  ]
  const explicit = t.match(/\b(?:option|answer|letter)\s+([abcd])\b/)
  if (explicit) return 'abcd'.indexOf(explicit[1])
  if (t.trim().length <= 4) for (const [re, i] of letters) if (re.test(t) && i < options.length) return i
  let best: number | null = null
  let bestScore = 0
  options.forEach((o, i) => {
    const words = o.toLowerCase().split(/\W+/).filter((w) => w.length > 1)
    const score = words.filter((w) => t.includes(` ${w} `) || t.includes(w)).length / Math.max(1, words.length)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return bestScore >= 0.5 ? best : null
}

export function VoiceQuiz({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const ai = useAiTask('mcqs', doc.id, P.mcqs(s), { auto: true })
  const [qs, setQs] = useState<Mcq[]>([])
  const [i, setI] = useState(-1)
  const [phase, setPhase] = useState<'idle' | 'speaking' | 'listening' | 'feedback' | 'done'>('idle')
  const [heard, setHeard] = useState('')
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const stopRef = useRef<() => void>(undefined)

  useEffect(() => () => {
    stopRef.current?.()
    if (ttsSupported()) speechSynthesis.cancel()
  }, [])

  const ask = async (list: Mcq[], idx: number) => {
    const q = list[idx]
    setI(idx)
    setHeard('')
    setChosen(null)
    setPhase('speaking')
    await speakOnce(`Question ${idx + 1}. ${q.question}. ${q.options.map((o, k) => `Option ${letter(k)}: ${o}.`).join(' ')}`, s.language, 1)
    startListening(q)
  }

  const startListening = (q: Mcq) => {
    if (!sttSupported()) return setPhase('listening')
    setPhase('listening')
    stopRef.current = listen(s.language, {
      onText: (t, final) => {
        setHeard(t)
        if (final) {
          const m = matchSpoken(t, q.options)
          if (m !== null) {
            stopRef.current?.()
            decide(q, m)
          }
        }
      },
      onError: () => {},
    })
  }

  const decide = async (q: Mcq, k: number) => {
    stopRef.current?.()
    setChosen(k)
    setPhase('feedback')
    const ok = k === q.answerIndex
    if (ok) {
      setScore((x) => x + 1)
      sfx.correct()
      await speakOnce('Correct! Well done.', 'en')
    } else {
      sfx.wrong()
      addMistake({ docId: doc.id, source: 'voice', question: q.question, correctAnswer: q.options[q.answerIndex], yourAnswer: q.options[k], explanation: q.explanation, page: q.page, topic: q.topic ?? undefined })
      await speakOnce(`Not quite. The answer is option ${letter(q.answerIndex)}: ${q.options[q.answerIndex]}.`, s.language)
    }
  }

  const next = async () => {
    if (i + 1 >= qs.length) {
      setPhase('done')
      await recordAttempt({ docId: doc.id, kind: 'voice', correct: score, total: qs.length })
      await awardXp(score * 8 + 10, 'Voice quiz')
      return
    }
    ask(qs, i + 1)
  }

  const start = () => {
    const list = shuffle(ai.data?.questions ?? []).slice(0, 6)
    setQs(list)
    setScore(0)
    ask(list, 0)
  }

  const q = qs[i]

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()}>
      <div className="mx-auto max-w-2xl">
        <div className="surface p-6 md:p-8">
          <div className="flex items-center gap-4">
            <TeacherAvatar speaking={phase === 'speaking'} size={72} />
            <div>
              <h3 className="text-3xl">Voice quiz</h3>
              <p className="text-sm text-muted-foreground">Questions are read aloud — answer by saying “option B” or the answer itself.</p>
            </div>
          </div>

          {phase === 'idle' && (
            <div className="mt-8 text-center">
              {!sttSupported() && <p className="mb-4 text-sm text-gold">Speech recognition isn’t supported here — you can tap answers instead. Chrome/Edge recommended.</p>}
              <Button size="xl" variant="coral" onClick={start}>
                <Play /> Start voice quiz
              </Button>
            </div>
          )}

          {q && phase !== 'idle' && phase !== 'done' && (
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <p className="section-label">
                  Question {i + 1} / {qs.length} · score {score}
                </p>
                <p className="mt-2 text-xl font-semibold">{q.question}</p>
                <div className="mt-4 grid gap-2">
                  {q.options.map((o, k) => (
                    <button
                      key={k}
                      disabled={phase === 'feedback'}
                      onClick={() => decide(q, k)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-3 text-left transition',
                        phase === 'feedback' && k === q.answerIndex && 'border-success bg-success/15',
                        phase === 'feedback' && k === chosen && k !== q.answerIndex && 'border-coral bg-coral/15',
                      )}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold">{letter(k)}</span>
                      {o}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex min-h-[56px] items-center gap-3 rounded-2xl bg-secondary/60 p-3">
                  {phase === 'speaking' && (
                    <>
                      <Volume2 className="h-5 w-5 text-gold" /> <span className="text-sm text-muted-foreground">Reading the question…</span>
                    </>
                  )}
                  {phase === 'listening' && (
                    <>
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="flex h-9 w-9 items-center justify-center rounded-full bg-coral text-white">
                        <Mic className="h-4 w-4" />
                      </motion.span>
                      <span className="flex-1 text-sm">{heard || <span className="text-muted-foreground">Listening… say your answer</span>}</span>
                      <Button size="sm" variant="ghost" onClick={() => startListening(q)}>
                        Retry mic
                      </Button>
                    </>
                  )}
                  {phase === 'feedback' && (
                    <>
                      {chosen === q.answerIndex ? <CheckCircle2 className="h-6 w-6 text-success" /> : <XCircle className="h-6 w-6 text-coral" />}
                      <span className="flex-1 text-sm">{chosen === q.answerIndex ? 'Correct!' : q.explanation}</span>
                      <Button size="sm" variant="coral" onClick={next}>
                        Next <SkipForward />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {phase === 'done' && (
            <div className="mt-8 text-center">
              <p className="font-serif text-7xl">
                {score}/{qs.length}
              </p>
              <p className="mt-2 text-sm text-gold">🪙 +{score * 8 + 10} XP</p>
              <Button className="mt-6" variant="coral" onClick={start}>
                Play again
              </Button>
            </div>
          )}
        </div>
      </div>
    </AsyncState>
  )
}
