import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Loader2, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignInCard } from '@/components/SignInCard'
import { CodeInput } from '@/components/CodeInput'
import { useAuth } from '@/lib/firebase'
import { createGroup, joinGroupByCode, myGroupsQuery, MAX_MEMBERS, type Group } from '@/lib/groups'
import { useCollection } from '@/hooks/useFirestore'
import { Skeleton } from '@/components/ui/skeleton'
import { DOC_COLORS } from '@/components/DocCard'
import { cn } from '@/lib/utils'

export default function Groups() {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const groups = useCollection<Group>(user ? myGroupsQuery(user.uid) : null, [user?.uid])
  const [create, setCreate] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Skeleton className="h-64" />
  if (!user)
    return (
      <>
        <PageHeader title="Groups" subtitle="Study squads of up to 3 — share chapters, battle live, call and focus together." />
        <SignInCard />
      </>
    )

  const doCreate = async () => {
    setBusy(true)
    try {
      const gid = await createGroup(name, user)
      toast.success('Group created! Share the invite code with your friends.')
      nav(`/groups/${gid}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const doJoin = async (c = code) => {
    setBusy(true)
    try {
      const gid = await joinGroupByCode(c, user)
      toast.success('Joined the group!')
      nav(`/groups/${gid}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Groups"
        subtitle="Study squads of up to 3 — share chapters, battle live, call and focus together."
        actions={
          <Button variant="coral" onClick={() => setCreate(true)}>
            <Plus /> New group
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {groups.loading && <Skeleton className="h-28" />}
          {groups.error && <p className="text-sm text-coral">{groups.error}</p>}
          {groups.data?.length === 0 && (
            <button onClick={() => setCreate(true)} className="dashed-card flex w-full items-center gap-4 p-6 text-left hover:border-coral/50">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-soft text-coral">
                <Plus />
              </span>
              <span>
                <span className="block text-lg font-bold">Create your first group</span>
                <span className="text-sm text-muted-foreground">Then invite 2 friends with a 6-digit code or QR</span>
              </span>
            </button>
          )}
          {groups.data?.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/groups/${g.id}`} className={cn('flex items-center gap-4 rounded-3xl border p-5 transition hover:-translate-y-0.5', DOC_COLORS[i % DOC_COLORS.length])}>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/30 text-3xl">{g.emoji ?? '📚'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold">{g.name}</p>
                  <p className="text-sm text-foreground/60">
                    <Users className="mr-1 inline h-3.5 w-3.5" />
                    {g.memberIds.length}/{MAX_MEMBERS} members · code {g.inviteCode}
                  </p>
                </div>
                {g.activeBattleId && <span className="chip-coral animate-pulse">⚔️ Live battle</span>}
                <ChevronRight className="h-5 w-5 text-foreground/50" />
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="surface h-fit p-6 text-center">
          <h3 className="text-3xl">Join with a code</h3>
          <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit invite code, or scan the group’s QR with your phone camera.</p>
          <CodeInput className="mt-6" value={code} onChange={setCode} onComplete={(c) => doJoin(c)} />
          <Button className="mt-6 w-full" size="lg" disabled={busy || code.length !== 6} onClick={() => doJoin()}>
            {busy ? <Loader2 className="animate-spin" /> : null} Join group
          </Button>
        </div>
      </div>

      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>Up to {MAX_MEMBERS} members. You’ll get an invite code and QR to share.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Group name (e.g. Physics Avengers)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doCreate()} />
          <Button variant="coral" size="lg" disabled={busy} onClick={doCreate}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Create group
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
