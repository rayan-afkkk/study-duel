import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Coffee, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import type { User } from 'firebase/auth'
import { useDoc } from '@/hooks/useFirestore'
import { focusRef, setFocus, setPresence, type FocusState, type Member } from '@/lib/groups'
import { Button } from '@/components/ui/button'
import { Avatar } from './Leaderboard'
import { awardXp, incMeta } from '@/lib/progress'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

const FOCUS = 25 * 60_000
const BREAK = 5 * 60_000

function remaining(s?: FocusState | null) {
  if (!s || s.phase === 'idle') return FOCUS
  if (s.startedAt == null) return s.pausedRemainingMs ?? s.durationMs
  return Math.max(0, s.durationMs - (Date.now() - s.startedAt))
}

/** Shared Pomodoro: one timer for the whole group, and you can see who's focusing right now. */
export function FocusRoom({ gid, user, members }: { gid: string; user: User; members: (Member & { id: string })[] }) {
  const { data: state } = useDoc<FocusState>(focusRef(gid), [gid])
  const [now, setNow] = useState(Date.now())
  const [joined, setJoined] = useState(false)
  const rewarded = useRef<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setPresence(gid, user.uid, joined && state?.phase === 'focus').catch(() => {})
  }, [joined, state?.phase, gid, user.uid])

  useEffect(() => () => void setPresence(gid, user.uid, false).catch(() => {}), [gid, user.uid])

  const left = remaining(state)
  void now
  const running = !!state && state.phase !== 'idle' && state.startedAt != null

  // Session completed
  useEffect(() => {
    if (!state || !running || left > 0) return
    if (rewarded.current === state.startedAt) return
    rewarded.current = state.startedAt
    sfx.win()
    if (state.phase === 'focus') {
      if (joined) {
        awardXp(25, 'Focus session')
        incMeta('focusMinutes', Math.round(state.durationMs / 60000))
      }
      if (state.startedBy === user.uid) setFocus(gid, { phase: 'break', startedAt: Date.now(), durationMs: BREAK, startedBy: user.uid })
    } else if (state.startedBy === user.uid) {
      setFocus(gid, { phase: 'idle', startedAt: null, durationMs: FOCUS })
    }
  }, [left, running, state, joined, gid, user.uid])

  const start = (phase: 'focus' | 'break') => {
    setFocus(gid, { phase, startedAt: Date.now(), durationMs: phase === 'focus' ? FOCUS : BREAK, startedBy: user.uid })
    if (phase === 'focus') setJoined(true)
  }
  const pause = () => state && setFocus(gid, { ...state, startedAt: null, pausedRemainingMs: left })
  const resume = () => state && setFocus(gid, { ...state, startedAt: Date.now() - (state.durationMs - (state.pausedRemainingMs ?? state.durationMs)), pausedRemainingMs: null, startedBy: user.uid })
  const reset = () => setFocus(gid, { phase: 'idle', startedAt: null, durationMs: FOCUS })

  const total = state?.durationMs ?? FOCUS
  const pct = 1 - left / total
  const mm = String(Math.floor(left / 60000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
  const phase = state?.phase ?? 'idle'
  const focusing = members.filter((m) => m.focusing && phase === 'focus')

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="surface flex flex-col items-center p-8">
        <span className={cn('chip', phase === 'break' ? 'bg-success/15 text-success' : phase === 'focus' ? 'bg-coral-soft text-coral' : 'bg-secondary text-muted-foreground')}>
          {phase === 'break' ? <Coffee className="h-3 w-3" /> : <Timer className="h-3 w-3" />} {phase === 'idle' ? 'Ready' : phase === 'focus' ? 'Focus time' : 'Break time'}
        </span>
        <div className="relative my-6 h-64 w-64">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="44" fill="none" strokeWidth="6" strokeLinecap="round"
              stroke={phase === 'break' ? 'hsl(var(--success))' : 'hsl(var(--coral))'}
              strokeDasharray={276.5}
              animate={{ strokeDashoffset: 276.5 * (1 - pct) }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-7xl tabular-nums">
              {mm}:{ss}
            </span>
            <span className="text-xs text-muted-foreground">{focusing.length} focusing now</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {phase === 'idle' ? (
            <>
              <Button variant="coral" size="lg" onClick={() => start('focus')}>
                <Play /> Start 25-min focus
              </Button>
              <Button variant="secondary" size="lg" onClick={() => start('break')}>
                <Coffee /> 5-min break
              </Button>
            </>
          ) : (
            <>
              {running ? (
                <Button size="lg" variant="secondary" onClick={pause}>
                  <Pause /> Pause
                </Button>
              ) : (
                <Button size="lg" variant="coral" onClick={resume}>
                  <Play /> Resume
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={reset}>
                <RotateCcw /> Reset
              </Button>
            </>
          )}
        </div>
        {phase === 'focus' && (
          <Button className="mt-4" variant={joined ? 'secondary' : 'default'} onClick={() => setJoined(!joined)}>
            {joined ? "I'm focusing ✓ (tap to leave)" : 'Join this focus session'}
          </Button>
        )}
        <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground">The timer is shared: when anyone starts or pauses it, everyone in the group sees it. Finish a focus session to earn 🪙 25 XP.</p>
      </div>
      <div className="surface h-fit p-5">
        <p className="section-label mb-4">Who’s here</p>
        <div className="space-y-3">
          {members.map((m) => {
            const on = m.focusing && phase === 'focus'
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar m={m} />
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', on ? 'bg-success' : 'bg-muted-foreground/40')} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{on ? `Focusing · ${Math.max(1, Math.round((Date.now() - (m.focusSince ?? Date.now())) / 60000))} min` : 'Not focusing'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
