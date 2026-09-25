import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, Circle, Loader2, Sparkles, Target, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { db, type PlanEntry } from '@/lib/db'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Param } from '@/sims/SimShell'
import { EmptyState } from '@/components/EmptyState'
import { ErrorCard, LoadingMessages } from '@/components/AsyncState'
import { callAi, getCached } from '@/lib/aiClient'
import { getDocContext } from '@/lib/db'
import { P } from '@/lib/params'
import { getSettings, useSettings } from '@/lib/settings'
import { weakTopics, awardXp } from '@/lib/progress'
import { localPlan } from '@/lib/localPlan'
import { cn, daysBetween, todayISO } from '@/lib/utils'
import { Link } from 'react-router-dom'

async function chapterTopics(docId: string) {
  const s = getSettings()
  const e = (await getCached('explain', docId, P.explain(s))) ?? (await getCached('explain', docId, P.explain({ language: 'en', difficulty: 'medium', mode: 'concept' })))
  if (e) return e.topics.map((t) => t.title)
  const sum = await getCached('summary', docId, P.summary(s))
  if (sum) return sum.keyTerms.map((k) => k.term).slice(0, 8)
  return []
}

export default function StudyPlan() {
  const s = useSettings()
  const docs = useLiveQuery(() => db.documents.orderBy('createdAt').reverse().toArray(), [])
  const [docId, setDocId] = useState<string>()
  const plan = useLiveQuery(() => (docId ? db.plans.get(docId) : undefined), [docId])
  const defaultDate = todayISO(new Date(Date.now() + 14 * 86400000))
  const [examDate, setExamDate] = useState(defaultDate)
  const [prev, setPrev] = useState(60)
  const [minutes, setMinutes] = useState(90)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [weak, setWeak] = useState<string[]>([])

  useEffect(() => {
    if (!docId && docs?.length) setDocId(docs[0].id)
  }, [docs, docId])

  useEffect(() => {
    if (docId) weakTopics(docId).then(setWeak)
  }, [docId])

  useEffect(() => {
    if (plan) {
      setExamDate(plan.examDate)
      setPrev(plan.prevPercent)
      setMinutes(plan.dailyMinutes)
    }
  }, [plan])

  const save = async (data: PlanEntry['data']) => {
    await db.plans.put({ docId: docId!, examDate, prevPercent: prev, dailyMinutes: minutes, data, done: [], createdAt: Date.now() })
    await awardXp(10, 'Created a study plan')
  }

  const generateAi = async () => {
    if (!docId) return
    setBusy(true)
    setError(undefined)
    try {
      const topics = await chapterTopics(docId)
      const context = (await getDocContext(docId)).slice(0, 30_000)
      const daysLeft = Math.max(1, daysBetween(todayISO(), examDate) + 1)
      const res = await callAi('studyPlan', { context, language: s.language, today: todayISO(), examDate, daysLeft, prevPercent: prev, dailyMinutes: minutes, weakTopics: weak, topics })
      await save(res.data)
      toast.success('Your study plan is ready!')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const generateOffline = async () => {
    if (!docId) return
    const topics = await chapterTopics(docId)
    await save(localPlan({ topics, weak, examDate, prevPercent: prev, dailyMinutes: minutes }))
    setError(undefined)
    toast.success('Offline plan created')
  }

  const toggle = async (date: string) => {
    if (!plan) return
    const done = plan.done.includes(date) ? plan.done.filter((d) => d !== date) : [...plan.done, date]
    await db.plans.update(plan.docId, { done })
    if (!plan.done.includes(date)) await awardXp(15, 'Completed a study day')
  }

  const daysLeft = daysBetween(todayISO(), plan?.examDate ?? examDate)
  const progress = useMemo(() => (plan ? plan.done.length / Math.max(1, plan.data.days.length) : 0), [plan])

  if (docs && docs.length === 0)
    return (
      <>
        <PageHeader title="Study Plan" />
        <EmptyState icon={<CalendarDays />} title="Add a chapter first" desc="Your plan is built from the chapter's topics and your weak areas." action={<Button asChild variant="coral"><Link to="/app">Go home</Link></Button>} />
      </>
    )

  return (
    <div>
      <PageHeader title="Study Plan" subtitle="A day-by-day plan that gives extra time to your weak topics." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="surface space-y-5 p-6">
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select value={docId} onValueChange={setDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {docs?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam date</Label>
              <Input type="date" min={todayISO()} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <Param label="Previous exam %" value={prev} unit="%" min={0} max={100} step={1} onChange={setPrev} />
            <Param label="Study time per day" value={minutes} unit="min" min={20} max={240} step={10} onChange={setMinutes} />
            {weak.length > 0 && (
              <div>
                <p className="section-label mb-2">Weak topics (from your mistakes)</p>
                <div className="flex flex-wrap gap-1.5">
                  {weak.map((w) => (
                    <span key={w} className="chip-coral">
                      <Target className="h-3 w-3" /> {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Button variant="coral" size="lg" className="w-full" disabled={busy || !docId} onClick={generateAi}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {plan ? 'Regenerate plan' : 'Generate my plan'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={generateOffline} disabled={!docId}>
              <WifiOff /> Quick offline plan
            </Button>
          </div>
          {plan && (
            <div className="surface p-6 text-center">
              <p className="section-label">Exam in</p>
              <p className="font-serif text-7xl leading-none">{Math.max(0, daysLeft)}</p>
              <p className="text-sm text-muted-foreground">days</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full bg-coral" animate={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {plan.done.length}/{plan.data.days.length} days completed
              </p>
            </div>
          )}
        </div>

        <div>
          {busy && (
            <div className="surface p-6">
              <LoadingMessages messages={['Counting the days…', 'Giving weak topics extra love…', 'Planning revision days…']} />
            </div>
          )}
          {error && !busy && <ErrorCard error={error} onRetry={generateAi} extra={<Button variant="secondary" onClick={generateOffline}><WifiOff /> Use offline plan</Button>} />}
          {!plan && !busy && !error && (
            <EmptyState icon={<CalendarDays />} title="No plan yet" desc="Set your exam date and previous percentage, then generate your plan." />
          )}
          {plan && !busy && (
            <div className="space-y-3">
              {plan.data.tips.length > 0 && (
                <div className="rounded-3xl bg-gold-soft p-5 text-sm">
                  <p className="mb-2 font-semibold text-gold">Coach’s tips</p>
                  <ul className="list-inside list-disc space-y-1">
                    {plan.data.tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.data.days.map((d, i) => {
                const isToday = d.date === todayISO()
                const done = plan.done.includes(d.date)
                return (
                  <motion.div
                    key={d.date + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.6) }}
                    className={cn('surface flex gap-4 p-5', isToday && 'border-coral ring-1 ring-coral', done && 'opacity-60')}
                  >
                    <button onClick={() => toggle(d.date)} className="mt-0.5" aria-label="Mark done">
                      {done ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {isToday && <span className="chip-coral">Today</span>}
                        <span className="chip-muted">{d.minutes} min</span>
                      </div>
                      <p className={cn('mt-1 text-lg font-bold', s.language === 'ur' && 'urdu')}>{d.title}</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {d.tasks.map((t, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-coral" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
