import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Award } from 'lucide-react'
import type { Member } from '@/lib/groups'
import { BADGES } from '@/lib/progress'
import { useStats } from '@/hooks/useStats'
import { weekly, Avatar } from './Leaderboard'
import { weekKey } from '@/lib/utils'

const COLORS = ['#EE6A4F', '#E6B54A', '#6FA8DC']
const tip = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }
const axis = { tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }, axisLine: false, tickLine: false }

function MetricChart({ title, data, unit }: { title: string; data: { name: string; value: number }[]; unit?: string }) {
  return (
    <div className="surface p-5">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={32} />
            <Tooltip contentStyle={tip} cursor={{ fill: 'hsl(var(--secondary))' }} formatter={(v) => `${v}${unit ?? ''}`} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Weekly report card: compare with friends + your own daily XP. */
export function ReportCard({ members, me }: { members: (Member & { id: string })[]; me: string }) {
  const stats = useStats()
  const wk = weekKey()
  const cur = (m: Member) => m.weekKey === wk
  const first = (m: Member) => m.name.split(' ')[0]
  const xp = members.map((m) => ({ name: first(m), value: weekly(m) }))
  const acc = members.map((m) => ({ name: first(m), value: cur(m) ? m.accuracy ?? 0 : 0 }))
  const cards = members.map((m) => ({ name: first(m), value: cur(m) ? m.cardsWeek ?? 0 : 0 }))
  const focus = members.map((m) => ({ name: first(m), value: m.focusMinutes ?? 0 }))

  const maxOf = (arr: { value: number }[]) => Math.max(1, ...arr.map((x) => x.value))
  const radar = ['XP', 'Accuracy', 'Cards', 'Focus', 'Streak'].map((metric) => {
    const row: Record<string, string | number> = { metric }
    members.forEach((m, i) => {
      const v =
        metric === 'XP' ? xp[i].value / maxOf(xp) : metric === 'Accuracy' ? acc[i].value / 100 : metric === 'Cards' ? cards[i].value / maxOf(cards) : metric === 'Focus' ? focus[i].value / maxOf(focus) : (m.streak ?? 0) / Math.max(1, ...members.map((x) => x.streak ?? 0))
      row[first(m)] = Math.round(v * 100)
    })
    return row
  })

  const awards = [
    { title: 'XP Champion', pick: xp },
    { title: 'Sharpshooter', pick: acc },
    { title: 'Card Master', pick: cards },
    { title: 'Focus Monk', pick: focus },
  ].map((a) => {
    const best = [...a.pick].sort((x, y) => y.value - x.value)[0]
    return { ...a, winner: best && best.value > 0 ? best.name : null }
  })

  const myMember = members.find((m) => m.id === me)

  return (
    <div className="space-y-6">
      <div className="surface grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        {myMember && <Avatar m={myMember} size={72} />}
        <div>
          <p className="section-label">Week {wk.split('-W')[1]} report card</p>
          <h3 className="mt-1 text-4xl">
            {stats?.weeklyXp ?? 0} XP · {stats?.weeklyAccuracy == null ? 'no quizzes yet' : `${stats.weeklyAccuracy}% accuracy`}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {awards.map((a) => (
              <span key={a.title} className="chip-gold">
                <Award className="h-3 w-3" /> {a.title}: {a.winner ?? '—'}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricChart title="Weekly XP" data={xp} />
        <MetricChart title="Quiz accuracy" data={acc} unit="%" />
        <MetricChart title="Flashcards reviewed" data={cards} />
        <MetricChart title="Focus minutes (all time)" data={focus} unit=" min" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="mb-3 text-sm font-semibold">Strengths compared</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                {members.map((m, i) => (
                  <Radar key={m.id} name={first(m)} dataKey={first(m)} stroke={COLORS[i % 3]} fill={COLORS[i % 3]} fillOpacity={0.2} />
                ))}
                <Legend />
                <Tooltip contentStyle={tip} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface p-5">
          <p className="mb-3 text-sm font-semibold">Your XP this week</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyXp ?? []}>
                <XAxis dataKey="day" {...axis} />
                <YAxis {...axis} width={32} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Bar dataKey="xp" fill="hsl(var(--coral))" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface p-5">
        <p className="mb-4 text-sm font-semibold">Badges</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">Badge</th>
                {members.map((m) => (
                  <th key={m.id} className="pb-2 text-center font-medium">
                    {first(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BADGES.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2">
                    {b.emoji} {b.name}
                  </td>
                  {members.map((m) => (
                    <td key={m.id} className="py-2 text-center">
                      {m.badges?.includes(b.id) ? '✅' : <span className="text-muted-foreground">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
