import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Clock, Play, RefreshCw, Trophy, XCircle } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { StudyDoc } from '@/lib/db'
import { useMcqSet } from '@/lib/questions'
import { AsyncState } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { StudySettings } from '@/components/StudySettings'
import { addMistake } from '@/lib/mistakes'
import { awardXp, recordAttempt } from '@/lib/progress'
import { sfx } from '@/lib/sfx'
import { cn, letter } from '@/lib/utils'
import type { Mcq } from '@shared/schemas'

type Phase = 'setup' | 'test' | 'result'

export function McqTab({ doc }: { doc: StudyDoc }) {
  const ai = useMcqSet(doc.id, 'test')
  const [phase, setPhase] = useState<Phase>('setup')
  const [secsPerQ, setSecsPerQ] = useState('45')
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(0)
  const questions: Mcq[] = ai.data?.questions ?? []
  const submitted = useRef(false)

  const start = () => {
    setAnswers(questions.map(() => null))
    setI(0)
    setLeft(questions.length * Number(secsPerQ))
    submitted.current = false
    setPhase('test')
  }

  useEffect(() => {
    if (phase !== 'test') return
    const t = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'test' && left <= 0) submit()
    if (phase === 'test' && left > 0 && left <= 10) sfx.tick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase])

  const score = useMemo(() => answers.reduce<number>((n, a, idx) => n + (a === questions[idx]?.answerIndex ? 1 : 0), 0), [answers, questions])

  async function submit() {
    if (submitted.current) return
    submitted.current = true
    setPhase('result')
    const correct = answers.reduce<number>((n, a, idx) => n + (a === questions[idx].answerIndex ? 1 : 0), 0)
    await recordAttempt({ docId: doc.id, kind: 'mcq', correct, total: questions.length })
    await awardXp(correct * 10 + 10, 'MCQ test')
    for (let k = 0; k < questions.length; k++) {
      const q = questions[k]
      if (answers[k] !== q.answerIndex) {
        await addMistake({
          docId: doc.id,
          source: 'mcq',
          question: q.question,
          correctAnswer: q.options[q.answerIndex],
          yourAnswer: answers[k] == null ? '(no answer)' : q.options[answers[k]!],
          explanation: q.explanation,
          page: q.page,
          topic: q.topic ?? undefined,
        })
      }
    }
    if (correct / questions.length >= 0.8) {
      sfx.win()
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ['#EE6A4F', '#E6B54A', '#F4EDE1', '#6FCF97'] })
    }
  }

  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, '0')
  const ss = String(Math.max(0, left % 60)).padStart(2, '0')

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Writing tricky questions…', 'Hiding the right answer…', 'Crafting sneaky distractors…']}>
      {phase === 'setup' && (
        <div className="mx-auto max-w-2xl">
          <div className="surface p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft text-coral">
              <Trophy className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-5xl">MCQ Test</h2>
            <p className="mt-2 text-muted-foreground">
              {questions.length} questions · timed · explanations for every wrong answer
            </p>
            <div className="mt-8 space-y-4 text-left">
              <StudySettings compact />
              <div>
                <p className="section-label mb-2">Time per question</p>
                <Segmented
                  size="sm"
                  value={secsPerQ}
                  onChange={setSecsPerQ}
                  options={[
                    { value: '30', label: '30s' },
                    { value: '45', label: '45s' },
                    { value: '60', label: '60s' },
                    { value: '90', label: '90s' },
                  ]}
                />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="coral" onClick={start}>
                <Play /> Start test
              </Button>
              <Button size="lg" variant="secondary" onClick={() => ai.regenerate()}>
                <RefreshCw /> New questions
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'test' && questions[i] && (
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="chip-muted">
              Question {i + 1} / {questions.length}
            </span>
            <span className={cn('chip', left <= 10 ? 'bg-coral text-white' : 'bg-secondary text-foreground')}>
              <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
            </span>
          </div>
          <Progress value={((i + 1) / questions.length) * 100} indicatorClassName="bg-coral" />
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="surface mt-6 p-6 md:p-8">
              <h3 className="font-sans text-xl font-semibold leading-relaxed md:text-2xl">{questions[i].question}</h3>
              <div className="mt-6 grid gap-3">
                {questions[i].options.map((o, k) => (
                  <button
                    key={k}
                    onClick={() => {
                      sfx.click()
                      setAnswers((a) => a.map((x, idx) => (idx === i ? k : x)))
                    }}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:border-foreground/30',
                      answers[i] === k ? 'border-coral bg-coral-soft' : 'bg-secondary/40',
                    )}
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', answers[i] === k ? 'bg-coral text-white' : 'bg-secondary')}>
                      {letter(k)}
                    </span>
                    <span>{o}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
              Back
            </Button>
            <div className="hidden gap-1.5 md:flex">
              {questions.map((_, k) => (
                <button
                  key={k}
                  onClick={() => setI(k)}
                  className={cn('h-2.5 w-2.5 rounded-full transition', k === i ? 'bg-coral' : answers[k] != null ? 'bg-foreground/60' : 'bg-secondary')}
                  aria-label={`Question ${k + 1}`}
                />
              ))}
            </div>
            {i < questions.length - 1 ? (
              <Button onClick={() => setI(i + 1)}>Next</Button>
            ) : (
              <Button variant="coral" onClick={submit}>
                Submit
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="mx-auto max-w-3xl space-y-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="surface p-8 text-center">
            <p className="section-label">Your score</p>
            <p className="mt-2 font-serif text-8xl leading-none">
              {score}
              <span className="text-4xl text-muted-foreground">/{questions.length}</span>
            </p>
            <p className="mt-3 text-lg">
              {score / questions.length >= 0.8 ? 'Outstanding! 🎉' : score / questions.length >= 0.5 ? 'Good effort — review the ones you missed.' : 'Keep going — every mistake is saved for revision.'}
            </p>
            <p className="mt-1 text-sm text-gold">🪙 +{score * 10 + 10} XP</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="coral" onClick={start}>
                Retake
              </Button>
              <Button variant="secondary" onClick={() => setPhase('setup')}>
                Done
              </Button>
            </div>
          </motion.div>
          {questions.map((q, k) => {
            const ok = answers[k] === q.answerIndex
            return (
              <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.03 }} className={cn('surface p-5', !ok && 'border-coral/40')}>
                <div className="flex items-start gap-3">
                  {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral" />}
                  <div className="flex-1">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-2 text-sm">
                      <span className="text-success">✓ {q.options[q.answerIndex]}</span>
                      {!ok && <span className="ml-3 text-coral line-through">{answers[k] == null ? 'No answer' : q.options[answers[k]!]}</span>}
                    </p>
                    {!ok && <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">{q.explanation}</p>}
                  </div>
                  <PageBadge page={q.page} docId={doc.id} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </AsyncState>
  )
}
