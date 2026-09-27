import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Copy, FileText, LogOut, MessageCircle, MessageCircleQuestion, Phone, QrCode, Swords, Timer, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/firebase'
import { useCollection, useDoc } from '@/hooks/useFirestore'
import { groupRef, joinUrl, leaveGroup, membersCol, MAX_MEMBERS, recentMessagesQuery, syncMyStats, type ChatMessage, type Group, type Member } from '@/lib/groups'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignInCard } from '@/components/SignInCard'
import { ErrorCard, SkeletonBlock } from '@/components/AsyncState'
import { useCall } from '@/components/call/CallProvider'
import { watchCall } from '@/lib/call/CallManager'
import { Avatar, Leaderboard } from '@/features/group/Leaderboard'
import { SharedMaterials, useShared } from '@/features/group/SharedMaterials'
import { DoubtBoard } from '@/features/group/DoubtBoard'
import { FocusRoom } from '@/features/group/FocusRoom'
import { ReportCard } from '@/features/group/ReportCard'
import { BattleLauncher } from '@/features/group/BattleLauncher'
import { GroupChat, unreadCount } from '@/features/group/GroupChat'

export default function GroupDetail() {
  const { gid = '' } = useParams()
  const { user, loading } = useAuth()
  if (loading) return <SkeletonBlock />
  if (!user) return <SignInCard />
  return <GroupInner gid={gid} uid={user.uid} />
}

function GroupInner({ gid, uid }: { gid: string; uid: string }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const group = useDoc<Group>(groupRef(gid), [gid])
  const members = useCollection<Member>(membersCol(gid), [gid])
  const messages = useCollection<ChatMessage>(recentMessagesQuery(gid), [gid])
  const shared = useShared(gid)
  const call = useCall()
  const [inCallCount, setInCallCount] = useState(0)
  const [qr, setQr] = useState(false)
  const tab = params.get('tab') ?? 'battle'

  useEffect(() => {
    const unsubscribe = watchCall(gid, setInCallCount)
    return () => unsubscribe()
  }, [gid])
  useEffect(() => {
    syncMyStats().catch(() => {})
  }, [])

  if (group.error)
    return <ErrorCard error="You’re not a member of this group (or it no longer exists). Ask a friend for the invite code." extra={<Button asChild variant="secondary"><Link to="/groups">Back to groups</Link></Button>} />
  if (group.loading || !group.data) return group.data === null ? <ErrorCard error="This group no longer exists." /> : <SkeletonBlock />
  const g = group.data
  const list = members.data ?? []
  const inThisCall = call.groupId === gid && call.state.status !== 'idle'
  const unread = tab === 'chat' ? 0 : unreadCount(gid, messages.data, uid)

  const copy = () => {
    navigator.clipboard.writeText(g.inviteCode)
    toast.success('Invite code copied')
  }

  const leave = async () => {
    if (!user || !confirm(`Leave "${g.name}"?`)) return
    if (inThisCall) await call.leave()
    await leaveGroup(gid, g, user)
    nav('/groups')
  }

  return (
    <div>
      <Link to="/groups" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Groups
      </Link>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ocean text-4xl">{g.emoji ?? '📚'}</span>
          <div>
            <h1 className="text-5xl leading-none md:text-6xl">{g.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2">
                {list.map((m) => (
                  <Avatar key={m.id} m={m} size={28} className="border-2 border-background" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {g.memberIds.length}/{MAX_MEMBERS} members
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="chip-gold px-4 py-2 text-sm">
            <Copy className="h-3.5 w-3.5" /> {g.inviteCode}
          </button>
          <Button variant="secondary" onClick={() => setQr(true)}>
            <QrCode /> QR
          </Button>
          <Button variant={inThisCall ? 'secondary' : 'coral'} disabled={inThisCall} onClick={() => call.start(gid, g.name)}>
            <Phone /> {inThisCall ? 'In call' : inCallCount > 0 ? `Join call (${inCallCount})` : 'Start call'}
          </Button>
          <Button variant="ghost" size="icon" onClick={leave} aria-label="Leave group">
            <LogOut />
          </Button>
        </div>
      </div>

      {g.activeBattleId && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => nav(`/battle/${gid}/${g.activeBattleId}`)}
          className="mb-6 flex w-full items-center gap-3 rounded-3xl bg-coral p-4 text-left text-white glow-coral"
        >
          <Swords className="h-6 w-6" />
          <span className="flex-1 font-semibold">A live battle is running — jump in!</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm">Join →</span>
        </motion.button>
      )}

      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="battle"><Swords /> Battle</TabsTrigger>
          <TabsTrigger value="chat" data-tab="chat">
            <MessageCircle /> Chat
            {unread > 0 && <span className="ml-1 rounded-full bg-coral px-1.5 text-[11px] font-bold leading-5 text-white">{unread > 99 ? '99+' : unread}</span>}
          </TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy /> Leaderboard</TabsTrigger>
          <TabsTrigger value="shared"><FileText /> Shared</TabsTrigger>
          <TabsTrigger value="doubts"><MessageCircleQuestion /> Doubts</TabsTrigger>
          <TabsTrigger value="focus"><Timer /> Focus room</TabsTrigger>
          <TabsTrigger value="report"><BarChart3 /> Report card</TabsTrigger>
        </TabsList>
        <TabsContent value="battle">{user && <BattleLauncher gid={gid} user={user} activeBattleId={g.activeBattleId} />}</TabsContent>
        <TabsContent value="chat">{user && <GroupChat gid={gid} user={user} messages={messages} members={list} />}</TabsContent>
        <TabsContent value="leaderboard">
          <Leaderboard members={list} me={uid} />
        </TabsContent>
        <TabsContent value="shared">
          <SharedMaterials gid={gid} shared={shared} />
        </TabsContent>
        <TabsContent value="doubts">{user && <DoubtBoard gid={gid} user={user} shared={shared.data ?? []} />}</TabsContent>
        <TabsContent value="focus">{user && <FocusRoom gid={gid} user={user} members={list} />}</TabsContent>
        <TabsContent value="report">
          <ReportCard members={list} me={uid} />
        </TabsContent>
      </Tabs>

      <Dialog open={qr} onOpenChange={setQr}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center pr-0 text-center">
            <DialogTitle>Scan to join</DialogTitle>
            <DialogDescription>Point your phone camera at the code — it opens StudyDuel and joins “{g.name}”.</DialogDescription>
          </DialogHeader>
          <div className="mx-auto rounded-3xl bg-white p-5">
            <QRCodeSVG value={joinUrl(g.inviteCode)} size={220} fgColor="#000000" bgColor="#ffffff" level="M" />
          </div>
          <p className="font-serif text-5xl tracking-[0.2em]">{g.inviteCode}</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
