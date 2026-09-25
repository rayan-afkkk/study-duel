import { useState } from 'react'
import { orderBy, query, updateDoc } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from 'firebase/auth'
import { useCollection } from '@/hooks/useFirestore'
import { doubtsCol, postDoubt, postReply, repliesCol, type Doubt, type Reply, type SharedMaterial } from '@/lib/groups'
import { callAi } from '@/lib/aiClient'
import { useSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageBadge } from '@/components/DocViewer'
import { Inline } from '@/components/RichText'
import { Avatar } from './Leaderboard'
import { relativeTime } from '@/lib/utils'

type SharedList = (SharedMaterial & { id: string })[]

export function DoubtBoard({ gid, user, shared }: { gid: string; user: User; shared: SharedList }) {
  const s = useSettings()
  const doubts = useCollection<Doubt>(query(doubtsCol(gid), orderBy('createdAt', 'desc')), [gid])
  const [text, setText] = useState('')
  const [source, setSource] = useState<string>('none')
  const [busy, setBusy] = useState(false)

  const ask = async () => {
    if (!text.trim()) return
    setBusy(true)
    const src = shared.find((x) => x.id === source)
    try {
      const ref = await postDoubt(gid, user, text.trim(), src ? { sharedId: src.id, title: src.title } : null)
      setText('')
      if (src) {
        // The AI answers first, using the shared chapter as its source (with page citations).
        const context = src.pages.map((p) => `[Page ${p.page}]\n${p.text}`).join('\n\n')
        callAi('doubt', { context, question: text.trim(), language: s.language })
          .then((r) => updateDoc(ref, { aiAnswer: r.data, aiStatus: 'done' }))
          .catch(() => updateDoc(ref, { aiStatus: 'error' }))
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface space-y-3 p-5">
        <Textarea className="min-h-[90px]" placeholder="What are you stuck on? e.g. Why don't action and reaction forces cancel?" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ask friends only</SelectItem>
              {shared.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  🤖 AI answers from: {x.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="coral" className="sm:ml-auto" disabled={busy || !text.trim()} onClick={ask}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Post doubt
          </Button>
        </div>
        {shared.length === 0 && <p className="text-xs text-muted-foreground">Tip: share a chapter to this group so the AI can answer doubts from it with page citations.</p>}
      </div>
      <AnimatePresence initial={false}>
        {doubts.data?.map((d) => (
          <motion.div key={d.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DoubtCard gid={gid} d={d} user={user} shared={shared} />
          </motion.div>
        ))}
      </AnimatePresence>
      {doubts.data?.length === 0 && <p className="text-center text-sm text-muted-foreground">No doubts yet — ask away!</p>}
    </div>
  )
}

function DoubtCard({ gid, d, user, shared }: { gid: string; d: Doubt & { id: string }; user: User; shared: SharedList }) {
  const replies = useCollection<Reply>(query(repliesCol(gid, d.id), orderBy('createdAt', 'asc')), [gid, d.id])
  const [reply, setReply] = useState('')
  const src = shared.find((x) => x.id === d.sharedId)
  const send = async () => {
    if (!reply.trim()) return
    await postReply(gid, d.id, user, reply.trim())
    setReply('')
  }
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-3">
        <Avatar m={{ name: d.authorName, photo: d.authorPhoto }} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{d.authorName}</p>
          <p className="text-xs text-muted-foreground">{d.createdAt ? relativeTime(d.createdAt.toMillis()) : 'now'}{d.sourceTitle ? ` · ${d.sourceTitle}` : ''}</p>
        </div>
      </div>
      <p className="mt-3 text-lg font-semibold">{d.text}</p>

      {d.aiStatus === 'pending' && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse text-gold" /> AI is answering from the chapter…
        </div>
      )}
      {d.aiAnswer && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold-soft/60 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
            <Bot className="h-4 w-4" /> AI answer
          </p>
          <div className="space-y-2 text-[15px] leading-relaxed">
            {d.aiAnswer.answer.split(/\n{2,}/).map((p, i) => (
              <p key={i}>
                <Inline text={p} />
              </p>
            ))}
          </div>
          {d.aiAnswer.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {d.aiAnswer.citations.map((c, i) => (
                <PageBadge key={i} page={c.page} pages={src?.pages} title={src?.title} />
              ))}
            </div>
          )}
        </div>
      )}
      {d.aiStatus === 'error' && <p className="mt-3 text-xs text-coral">The AI couldn’t answer this one — friends to the rescue!</p>}

      <div className="mt-4 space-y-3 border-t pt-4">
        {replies.data?.map((r) => (
          <div key={r.id} className="flex gap-3">
            <Avatar m={{ name: r.authorName, photo: r.authorPhoto }} size={28} />
            <div className="rounded-2xl bg-secondary/60 px-4 py-2 text-sm">
              <span className="font-semibold">{r.authorName.split(' ')[0]} </span>
              {r.text}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Input className="h-10" placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <Button size="icon" variant="secondary" onClick={send} aria-label="Send reply">
            <MessageCircle />
          </Button>
        </div>
      </div>
    </div>
  )
}

