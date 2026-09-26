import { ChevronRight, FlaskConical, LogIn, LogOut, Monitor, Moon, PlayCircle, Sun, Trash2, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Segmented } from '@/components/ui/segmented'
import { Button } from '@/components/ui/button'
import { StudySettings } from '@/components/StudySettings'
import { useStats } from '@/hooks/useStats'
import { setSettings, useSettings } from '@/lib/settings'
import { displayName, signInWithGoogle, signOut, useAuth } from '@/lib/firebase'
import { BADGES } from '@/lib/progress'
import { loadDemoData, DEMO_ID } from '@/lib/demo'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { clearErrors, getErrors } from '@/lib/errorLog'
import { useState } from 'react'

function Diagnostics() {
  const [errors, setErrors] = useState(getErrors)
  if (!errors.length) return null
  return (
    <div className="mt-10">
      <p className="section-label mb-3">Diagnostics</p>
      <div className="surface space-y-3 p-5">
        <p className="text-sm text-muted-foreground">The app recovered from these problems automatically. A screenshot of this box helps fix them.</p>
        {errors.map((e, i) => (
          <div key={i} className="rounded-2xl bg-secondary/60 p-3 font-mono text-[11px] leading-relaxed">
            <p className="text-coral">
              [{e.where}] {new Date(e.at).toLocaleString()} · {e.path}
            </p>
            <p className="break-words text-foreground">{e.message}</p>
            {e.stack && <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-muted-foreground">{e.stack}</pre>}
          </div>
        ))}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            clearErrors()
            setErrors([])
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

function Row({ icon, title, sub, onClick, danger }: { icon: React.ReactNode; title: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 border-b py-5 text-left transition hover:opacity-80">
      <span className={cn('[&_svg]:h-6 [&_svg]:w-6', danger ? 'text-coral' : 'text-muted-foreground')}>{icon}</span>
      <span className="flex-1">
        <span className={cn('block text-lg font-medium', danger && 'text-coral')}>{title}</span>
        {sub && <span className="block text-sm text-muted-foreground">{sub}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  )
}

export default function Profile() {
  const { user, enabled } = useAuth()
  const s = useSettings()
  const stats = useStats()
  const nav = useNavigate()

  const signIn = async () => {
    try {
      await signInWithGoogle()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const clearAll = async () => {
    if (!confirm('Delete ALL local study data (chapters, cards, progress)? This cannot be undone.')) return
    await db.delete()
    location.href = '/app'
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-6xl leading-none md:text-7xl">Account</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="surface p-6">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img src={user.photoURL} referrerPolicy="no-referrer" className="h-16 w-16 rounded-full" alt="" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ocean font-serif text-3xl">{(user ? displayName(user) : s.localName).slice(0, 1)}</div>
          )}
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="truncate text-xl font-bold">{displayName(user)}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </>
            ) : (
              <>
                <Input value={s.localName} onChange={(e) => setSettings({ localName: e.target.value })} className="h-10 max-w-xs" aria-label="Your name" />
                <p className="mt-1 text-xs text-muted-foreground">Guest mode — your study data stays on this device.</p>
              </>
            )}
          </div>
          {!user && enabled && (
            <Button onClick={signIn}>
              <LogIn /> Sign in with Google
            </Button>
          )}
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level {stats?.level ?? 1} · XP balance</span>
            <span className="font-bold">{stats?.totalXp ?? 0}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(stats?.levelProgress ?? 0) * 100}%` }} />
          </div>
        </div>
        {!enabled && <p className="mt-4 rounded-2xl bg-gold-soft p-3 text-xs text-gold">Firebase isn’t configured, so sign-in and groups are off. Add VITE_FIREBASE_* keys to .env (see README).</p>}
      </motion.div>

      <p className="section-label mb-3 mt-10">Appearance</p>
      <Segmented
        value={s.theme}
        onChange={(theme) => setSettings({ theme })}
        options={[
          { value: 'system', label: 'System', icon: <Monitor /> },
          { value: 'light', label: 'Light', icon: <Sun /> },
          { value: 'dark', label: 'Dark', icon: <Moon /> },
        ]}
      />
      <p className="mt-3 text-sm text-muted-foreground">Choose how StudyDuel looks. System follows your device.</p>

      <p className="section-label mb-3 mt-10">Study preferences</p>
      <StudySettings />

      <p className="section-label mb-3 mt-10">Badges</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BADGES.map((b) => {
          const earned = stats?.badges.includes(b.id)
          return (
            <div key={b.id} className={cn('surface p-4 text-center transition', !earned && 'opacity-40 grayscale')}>
              <div className="text-3xl">{b.emoji}</div>
              <p className="mt-2 text-sm font-bold">{b.name}</p>
              <p className="text-[11px] text-muted-foreground">{b.desc}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8">
        <Row
          icon={<FlaskConical />}
          title="Load demo data"
          sub="Sample chapter with all content — works offline"
          onClick={async () => {
            await loadDemoData()
            nav(`/doc/${DEMO_ID}`)
          }}
        />
        <Row icon={<Users />} title="Groups & battles" sub="Study with up to 2 friends" onClick={() => nav('/groups')} />
        <Row icon={<PlayCircle />} title="View landing page" onClick={() => nav('/')} />
        {user && <Row icon={<LogOut />} title="Sign out" danger onClick={() => signOut()} />}
        <Row icon={<Trash2 />} title="Delete local data" danger onClick={clearAll} />
      </div>
      <Diagnostics />
    </div>
  )
}
