import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { BookOpen, Camera, Flame, FlaskConical, Layers, NotebookPen, Plus, Sparkles, Swords, Target } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Segmented } from '@/components/ui/segmented'
import { Button } from '@/components/ui/button'
import { DocCard, QuestCard } from '@/components/DocCard'
import { UploadDialog } from '@/components/UploadDialog'
import { Gauge } from '@/components/Gauge'
import { useReadiness, useStats } from '@/hooks/useStats'
import { loadDemoData, DEMO_ID } from '@/lib/demo'
import { useAuth, displayName } from '@/lib/firebase'
import { getSettings } from '@/lib/settings'

type Filter = 'all' | 'pdf' | 'image' | 'text'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const [filter, setFilter] = useState<Filter>('all')
  const [upload, setUpload] = useState(false)
  const nav = useNavigate()
  const docs = useLiveQuery(() => db.documents.orderBy('createdAt').reverse().toArray(), [])
  const snippets = useLiveQuery(async () => {
    const out: Record<string, string> = {}
    for (const d of docs ?? []) {
      const c = await db.chunks.where('docId').equals(d.id).first()
      out[d.id] = (c?.text ?? '').replace(/\s+/g, ' ').slice(0, 110)
    }
    return out
  }, [docs])
  const due = useLiveQuery(() => db.cards.where('due').below(Date.now()).count(), [])
  const stats = useStats()
  const ready = useReadiness()
  const { user } = useAuth()
  const [demoLoading, setDemoLoading] = useState(false)

  const shown = useMemo(() => (docs ?? []).filter((d) => filter === 'all' || d.kind === filter), [docs, filter])
  const hasDemo = docs?.some((d) => d.id === DEMO_ID)

  const demo = async () => {
    setDemoLoading(true)
    await loadDemoData()
    setDemoLoading(false)
    toast.success('Demo chapter loaded — everything works offline!')
    nav(`/doc/${DEMO_ID}`)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'u' && e.altKey && setUpload(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const name = user ? displayName(user).split(' ')[0] : getSettings().localName

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}, {name} 👋
          </p>
          <h1 className="mt-1 text-6xl leading-none md:text-7xl">Home</h1>
        </div>
        <div className="flex items-center gap-2">
          {!hasDemo && (
            <Button variant="secondary" onClick={demo} disabled={demoLoading} className="hidden sm:inline-flex">
              <Sparkles /> Load demo data
            </Button>
          )}
          <Button variant="coral" onClick={() => setUpload(true)}>
            <Plus /> <span className="hidden sm:inline">Add chapter</span>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="surface flex flex-col items-center justify-center p-6 md:col-span-2 xl:col-span-1">
          <p className="section-label self-start">Exam readiness</p>
          <Gauge value={ready?.score ?? null} label={ready?.score == null ? 'Take a quiz to see your score' : "If you took the exam today"} />
          {ready?.parts.length ? (
            <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
              {ready.parts.map((p) => (
                <div key={p.label} className="rounded-2xl bg-secondary/60 px-2 py-2">
                  <p className="text-lg font-bold">{p.value === null ? '—' : `${p.value}%`}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{p.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="surface flex flex-col p-6">
          <p className="section-label">This week</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-6xl leading-none">{stats?.weeklyXp ?? 0}</span>
            <span className="text-muted-foreground">XP</span>
          </div>
          <div className="mt-2 h-24 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyXp ?? []}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                <Bar dataKey="xp" fill="hsl(var(--coral))" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4">
          <StatTile icon={<Flame />} value={stats?.streak ?? 0} label="Day streak" tone="text-coral" />
          <StatTile icon={<Layers />} value={due ?? 0} label="Cards due" tone="text-gold" />
          <StatTile icon={<Target />} value={stats?.mcqAccuracy == null ? '—' : `${stats.mcqAccuracy}%`} label="Quiz accuracy" tone="text-success" />
          <StatTile icon={<Swords />} value={stats?.level ?? 1} label="Level" tone="text-foreground" />
        </motion.div>
      </div>

      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-4xl">Your chapters</h2>
        <Segmented
          className="md:w-[460px]"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'pdf', label: 'PDFs', icon: <BookOpen /> },
            { value: 'image', label: 'Photos', icon: <Camera /> },
            { value: 'text', label: 'Notes', icon: <NotebookPen /> },
          ]}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {shown.map((d, i) => (
          <DocCard key={d.id} doc={d} snippet={snippets?.[d.id]} index={i} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {docs && docs.length === 0 && <QuestCard title="Add your first chapter" desc="Upload a PDF, photo or notes" reward={5} onClick={() => setUpload(true)} icon={<Plus />} />}
        {!hasDemo && <QuestCard title="Load demo data" desc="Sample physics chapter — works fully offline" reward={0} onClick={demo} icon={<FlaskConical />} />}
        <QuestCard title="Duel your friends" desc="Start a live Kahoot-style battle in a group" onClick={() => nav('/groups')} icon={<Swords />} />
        {(due ?? 0) > 0 && <QuestCard title={`Review ${due} due flashcards`} desc="Spaced repetition keeps them in memory" reward={due! * 2} onClick={() => docs?.[0] && nav(`/doc/${docs[0].id}?tab=flashcards`)} icon={<Layers />} />}
      </div>

      <UploadDialog open={upload} onOpenChange={setUpload} />
    </div>
  )
}

function StatTile({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone: string }) {
  return (
    <div className="surface flex flex-col justify-between p-4">
      <span className={`${tone} [&_svg]:h-5 [&_svg]:w-5`}>{icon}</span>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
