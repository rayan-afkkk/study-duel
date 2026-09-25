import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, CircleDashed, Lightbulb, Send } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import type { ExplainBackData } from '@shared/schemas'
import { generate, getCached } from '@/lib/aiClient'
import { P } from '@/lib/params'
import { useSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { MicButton } from '@/components/MicButton'
import { ErrorCard, LoadingMessages } from '@/components/AsyncState'
import { TeacherAvatar } from '@/components/TeacherAvatar'
import { awardXp, recordAttempt } from '@/lib/progress'
import { cn } from '@/lib/utils'

export function ExplainBack({ doc, initialTopic }: { doc: StudyDoc; initialTopic?: string }) {
  const s = useSettings()
  const [topics, setTopics] = useState<string[]>([])
  const [topic, setTopic] = useState(initialTopic ?? '')
  const [text, setText] = useState('')
  const [base, setBase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<ExplainBackData>()

  useEffect(() => {
    getCached('explain', doc.id, P.explain(s)).then((e) => {
      const t = e?.topics.map((x) => x.title) ?? []
      setTopics(t)
      if (!topic && t[0]) setTopic(t[0])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  const check = async () => {
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      const r = await generate('explainBack', { docId: doc.id, params: { topic, studentAnswer: text.trim(), language: s.language } })
      setResult(r)
      await recordAttempt({ docId: doc.id, kind: 'explainBack', correct: Math.round(r.score), total: 10, topic })
      await awardXp(10 + Math.round(r.score) * 2, 'Explain it back')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface space-y-4 p-6">
        <div className="flex items-center gap-4">
          <TeacherAvatar speaking={busy} size={64} />
          <div>
            <h3 className="text-3xl">Explain it back</h3>
            <p className="text-sm text-muted-foreground">Teach it to Ms. Noor in your own words — she’ll check it like a teacher.</p>
          </div>
        </div>
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button key={t} onClick={() => setTopic(t)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition', topic === t ? 'border-coral bg-coral-soft text-coral' : 'text-muted-foreground')}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <Input placeholder="Topic (e.g. Newton's third law)" value={topic} onChange={(e) => setTopic(e.target.value)} />
        )}
        <div className="relative">
          <Textarea
            className={cn('min-h-[220px] pr-16', s.language === 'ur' && 'urdu')}
            placeholder={`Explain "${topic || 'the topic'}" as if you were teaching a friend… (type or tap the mic)`}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setBase(e.target.value)
            }}
          />
          <MicButton lang={s.language} className="absolute bottom-3 right-3" onText={(t, final) => {
            const next = (base ? base + ' ' : '') + t
            setText(next)
            if (final) setBase(next)
          }} />
        </div>
        <Button variant="coral" size="lg" className="w-full" disabled={busy || text.trim().length < 15 || !topic} onClick={check}>
          <Send /> Check my explanation
        </Button>
      </div>

      <div>
        {busy && (
          <div className="surface p-6">
            <LoadingMessages messages={['Ms. Noor is reading carefully…', 'Comparing with the chapter…', 'Finding what you nailed…']} />
          </div>
        )}
        {error && <ErrorCard error={error} onRetry={check} />}
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="surface flex items-center gap-5 p-6">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round"
                    stroke={result.score >= 7 ? 'hsl(var(--success))' : result.score >= 4 ? 'hsl(var(--gold))' : 'hsl(var(--coral))'}
                    strokeDasharray={264}
                    initial={{ strokeDashoffset: 264 }}
                    animate={{ strokeDashoffset: 264 * (1 - result.score / 10) }}
                    transition={{ duration: 1 }}
                  />
                </svg>
                <span className="font-serif text-4xl">{result.score}</span>
              </div>
              <p className={cn('text-lg', s.language === 'ur' && 'urdu')}>{result.verdict}</p>
            </div>
            {result.correctPoints.length > 0 && (
              <Block icon={<CheckCircle2 className="text-success" />} title="What you got right">
                {result.correctPoints.map((p, i) => <li key={i}>{p}</li>)}
              </Block>
            )}
            {result.misunderstandings.length > 0 && (
              <Block icon={<AlertTriangle className="text-coral" />} title="Misunderstandings">
                {result.misunderstandings.map((m, i) => (
                  <li key={i}>
                    <span className="text-coral line-through decoration-coral/50">{m.what}</span>
                    <span className="mt-1 block text-foreground">→ {m.correction}</span>
                  </li>
                ))}
              </Block>
            )}
            {result.missing.length > 0 && (
              <Block icon={<CircleDashed className="text-gold" />} title="You missed">
                {result.missing.map((p, i) => <li key={i}>{p}</li>)}
              </Block>
            )}
            {result.tip && (
              <div className="flex gap-3 rounded-3xl bg-gold-soft p-5 text-sm">
                <Lightbulb className="h-5 w-5 shrink-0 text-gold" /> {result.tip}
              </div>
            )}
          </motion.div>
        )}
        {!busy && !error && !result && (
          <div className="dashed-card flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
            The best way to learn is to teach. Your feedback will appear here.
          </div>
        )}
      </div>
    </div>
  )
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <p className="mb-3 flex items-center gap-2 font-semibold [&_svg]:h-5 [&_svg]:w-5">
        {icon} {title}
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">{children}</ul>
    </div>
  )
}
