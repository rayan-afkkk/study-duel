import { motion } from 'framer-motion'
import { Crown, Flame } from 'lucide-react'
import type { Member } from '@/lib/groups'
import { BADGES } from '@/lib/progress'
import { cn, weekKey } from '@/lib/utils'

export const weekly = (m: Member) => (m.weekKey === weekKey() ? m.weeklyXp ?? 0 : 0)

export function Avatar({ m, size = 40, className }: { m: Pick<Member, 'name' | 'photo'>; size?: number; className?: string }) {
  return m.photo ? (
    <img src={m.photo} referrerPolicy="no-referrer" alt="" style={{ width: size, height: size }} className={cn('rounded-full object-cover', className)} />
  ) : (
    <span style={{ width: size, height: size }} className={cn('flex items-center justify-center rounded-full bg-ocean font-semibold', className)}>
      {m.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Leaderboard({ members, me }: { members: (Member & { id: string })[]; me?: string }) {
  const ranked = [...members].sort((a, b) => weekly(b) - weekly(a))
  const max = Math.max(1, ...ranked.map(weekly))
  return (
    <div className="space-y-6">
      <div className="surface flex items-end justify-center gap-4 p-6 pt-10">
        {[1, 0, 2].map((pos) => {
          const m = ranked[pos]
          if (!m) return <div key={pos} className="w-24" />
          const h = pos === 0 ? 150 : pos === 1 ? 110 : 80
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (3 - pos) }} className="flex w-24 flex-col items-center md:w-32">
              {pos === 0 && <Crown className="mb-1 h-7 w-7 text-gold" />}
              <Avatar m={m} size={pos === 0 ? 64 : 52} className={cn('border-4', pos === 0 ? 'border-gold' : 'border-card')} />
              <p className="mt-2 w-full truncate text-center text-sm font-semibold">{m.name.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">{weekly(m)} XP</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 80 }}
                className={cn('mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 font-serif text-4xl', pos === 0 ? 'bg-gold text-black' : pos === 1 ? 'bg-secondary' : 'bg-wine')}
              >
                {pos + 1}
              </motion.div>
            </motion.div>
          )
        })}
      </div>
      <div className="space-y-2">
        {ranked.map((m, i) => (
          <motion.div key={m.id} layout className={cn('surface flex items-center gap-4 p-4', m.id === me && 'border-coral/60')}>
            <span className="w-6 text-center font-serif text-2xl text-muted-foreground">{i + 1}</span>
            <Avatar m={m} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {m.name} {m.id === me && <span className="text-xs text-coral">(you)</span>}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full rounded-full bg-coral" initial={{ width: 0 }} animate={{ width: `${(weekly(m) / max) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(m.badges ?? []).map((b) => {
                  const def = BADGES.find((x) => x.id === b)
                  return def ? (
                    <span key={b} title={def.name} className="text-sm">
                      {def.emoji}
                    </span>
                  ) : null
                })}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{weekly(m)} XP</p>
              <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Flame className="h-3 w-3 text-coral" /> {m.streak ?? 0}d · Lv {m.level ?? 1}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Weekly rankings reset every Monday. Stats sync automatically as you study.</p>
    </div>
  )
}
