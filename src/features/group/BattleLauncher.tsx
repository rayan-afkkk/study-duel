import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2, Swords } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from 'firebase/auth'
import { db } from '@/lib/db'
import { generate } from '@/lib/aiClient'
import { avoidFor } from '@/lib/questions'
import { P } from '@/lib/params'
import { getSettings } from '@/lib/settings'
import { createBattle } from '@/lib/groups'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { shuffle } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function BattleLauncher({ gid, user, activeBattleId }: { gid: string; user: User; activeBattleId?: string | null }) {
  const docs = useLiveQuery(() => db.documents.orderBy('createdAt').reverse().toArray(), [])
  const [docId, setDocId] = useState<string>()
  const [count, setCount] = useState('8')
  const [secs, setSecs] = useState('20')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const chosen = docId ?? docs?.[0]?.id

  const start = async () => {
    if (!chosen) return
    setBusy(true)
    try {
      const d = await db.documents.get(chosen)
      const st = getSettings()
      const mcqs = await generate('mcqs', { docId: chosen, params: P.mcqs(st, 'battle'), extra: await avoidFor(chosen, st, 'battle') })
      const qs = shuffle(mcqs.questions).slice(0, Number(count))
      const bid = await createBattle(gid, user, d?.title ?? 'Live battle', qs, Number(secs))
      nav(`/battle/${gid}/${bid}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-4xl border bg-gradient-to-br from-wine via-card to-plum p-8">
        <Swords className="h-12 w-12 text-coral" />
        <h3 className="mt-4 text-5xl leading-none">Live battle</h3>
        <p className="mt-3 max-w-md text-foreground/70">
          Kahoot-style: everyone gets the same question at the same time. Faster correct answers earn more points (500–1000). Leaderboard after every question — winner gets
          confetti!
        </p>
        {activeBattleId && (
          <Button className="mt-6" variant="coral" size="lg" onClick={() => nav(`/battle/${gid}/${activeBattleId}`)}>
            ⚔️ Join the running battle
          </Button>
        )}
      </div>
      <div className="surface space-y-5 p-6">
        <div className="space-y-2">
          <Label>Quiz from chapter</Label>
          {docs?.length ? (
            <Select value={chosen} onValueChange={setDocId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Add a chapter (or load the demo) first.</p>
          )}
        </div>
        <div>
          <Label>Questions</Label>
          <Segmented className="mt-2" size="sm" value={count} onChange={setCount} options={['5', '8', '10'].map((v) => ({ value: v, label: v }))} />
        </div>
        <div>
          <Label>Seconds per question</Label>
          <Segmented className="mt-2" size="sm" value={secs} onChange={setSecs} options={['10', '20', '30'].map((v) => ({ value: v, label: `${v}s` }))} />
        </div>
        <Button variant="coral" size="lg" className="w-full" disabled={busy || !chosen} onClick={start}>
          {busy ? <Loader2 className="animate-spin" /> : <Swords />} Host a battle
        </Button>
      </div>
    </div>
  )
}
