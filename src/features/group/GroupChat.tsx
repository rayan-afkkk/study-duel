import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, MessageCircle, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from 'firebase/auth'
import { CHAT_MAX, deleteMessage, sendMessage, setTyping, type ChatMessage, type Member } from '@/lib/groups'
import { Button } from '@/components/ui/button'
import { Avatar } from './Leaderboard'
import { cn } from '@/lib/utils'

export type ChatList = (ChatMessage & { id: string })[]
type Members = (Member & { id: string })[]

const QUICK = ['👍', '😂', '🔥', '🤯', '📚', '✅']
const TYPING_FRESH_MS = 6000
const GROUP_GAP_MS = 5 * 60 * 1000

/** Time of a message; messages still being sent have no server time yet, so they count as "now". */
export const msgTime = (m: ChatMessage) => m.createdAt?.toMillis?.() ?? Date.now()

/** Oldest → newest, pending messages last. */
export function sortChat(list: ChatList | undefined): ChatList {
  return [...(list ?? [])].sort((a, b) => msgTime(a) - msgTime(b))
}

const readKey = (gid: string) => `studyduel:chatRead:${gid}`
export function getLastRead(gid: string) {
  try {
    return Number(localStorage.getItem(readKey(gid)) ?? 0)
  } catch {
    return 0
  }
}
function markRead(gid: string, t: number) {
  try {
    if (t > getLastRead(gid)) localStorage.setItem(readKey(gid), String(t))
  } catch {
    /* storage blocked: unread badge just won't persist */
  }
}

/** Messages from others that arrived after you last opened the chat. */
export function unreadCount(gid: string, list: ChatList | undefined, uid: string) {
  const last = getLastRead(gid)
  return (list ?? []).filter((m) => m.authorId !== uid && m.createdAt && msgTime(m) > last).length
}

function dayLabel(t: number) {
  const d = new Date(t)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** Real-time group chat (Firestore), with typing indicator, day separators and grouped bubbles. */
export function GroupChat({ gid, user, messages, members }: { gid: string; user: User; messages: { data?: ChatList; error?: string }; members: Members }) {
  const list = useMemo(() => sortChat(messages.data), [messages.data])
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const lastTypingPing = useRef(0)
  const lastCount = useRef(0)

  // who is typing right now (not me)
  const typing = members.filter((m) => m.uid !== user.uid && m.typingAt && now - m.typingAt < TYPING_FRESH_MS)
  useEffect(() => {
    if (!members.some((m) => m.typingAt)) return
    const t = setInterval(() => setNow(Date.now()), 1500)
    return () => clearInterval(t)
  }, [members])

  // opening the chat marks everything as read
  useEffect(() => {
    const newest = list.length ? msgTime(list[list.length - 1]) : 0
    if (newest) markRead(gid, newest)
  }, [gid, list])

  // stick to the bottom when new messages arrive (unless you scrolled up to read old ones)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const mineJustSent = list.length > lastCount.current && list[list.length - 1]?.authorId === user.uid
    if (atBottom || mineJustSent || lastCount.current === 0) el.scrollTop = el.scrollHeight
    lastCount.current = list.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length])

  // stop showing "typing…" when you leave the chat
  useEffect(() => {
    return () => {
      if (lastTypingPing.current) setTyping(gid, user.uid, false).catch(() => {})
    }
  }, [gid, user.uid])

  const onScroll = () => {
    const el = scroller.current
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }
  const toBottom = () => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const onType = (v: string) => {
    setText(v.slice(0, CHAT_MAX))
    const t = Date.now()
    if (v.trim() && t - lastTypingPing.current > 3000) {
      lastTypingPing.current = t
      setTyping(gid, user.uid, true).catch(() => {})
    }
  }

  const send = async (body = text) => {
    const msg = body.trim()
    if (!msg) return
    const fromBox = body === text
    if (fromBox) setText('')
    try {
      await sendMessage(gid, user, msg)
      if (lastTypingPing.current) {
        lastTypingPing.current = 0
        setTyping(gid, user.uid, false).catch(() => {})
      }
    } catch (e) {
      if (fromBox) setText(msg)
      const m = (e as Error).message
      toast.error(/permission/i.test(m) ? 'Chat isn’t switched on in Firebase yet. Publish the latest Firestore rules.' : m)
    }
    if (fromBox) input.current?.focus()
  }

  const remove = async (id: string) => {
    try {
      await deleteMessage(gid, id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const memberPhoto = (uid: string) => members.find((m) => m.uid === uid)?.photo

  return (
    <div className="surface flex h-[min(600px,calc(100dvh-300px))] min-h-[380px] flex-col overflow-hidden p-0">
      <div className="relative flex-1 overflow-hidden">
        <div ref={scroller} onScroll={onScroll} className="h-full space-y-1 overflow-y-auto px-3 py-4 sm:px-5" data-chat-scroll>
          {messages.error ? (
            <p className="mx-auto mt-10 max-w-sm text-center text-sm text-muted-foreground">
              Couldn’t load the chat. {/permission/i.test(messages.error) ? 'The Firestore rules need to be published with the chat section.' : messages.error}
            </p>
          ) : !messages.data ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">Loading messages…</p>
          ) : list.length === 0 ? (
            <div className="mx-auto mt-12 flex max-w-xs flex-col items-center text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-coral-soft text-coral">
                <MessageCircle className="h-7 w-7" />
              </span>
              <p className="font-serif text-3xl">Say hi 👋</p>
              <p className="mt-1 text-sm text-muted-foreground">Plan a study session, share a tip, or challenge your friends to a battle.</p>
            </div>
          ) : (
            list.map((m, i) => {
              const prev = list[i - 1]
              const t = msgTime(m)
              const newDay = !prev || new Date(msgTime(prev)).toDateString() !== new Date(t).toDateString()
              const grouped = !newDay && prev.authorId === m.authorId && t - msgTime(prev) < GROUP_GAP_MS
              const next = list[i + 1]
              const lastOfGroup = !next || next.authorId !== m.authorId || msgTime(next) - t >= GROUP_GAP_MS || new Date(msgTime(next)).toDateString() !== new Date(t).toDateString()
              const mine = m.authorId === user.uid
              const pending = !m.createdAt
              const emojiOnly = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s){1,8}$/u.test(m.text) && !/^[\d\s#*]+$/.test(m.text)
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <div className="py-3 text-center">
                      <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">{dayLabel(t)}</span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn('group flex items-end gap-2', mine ? 'justify-end' : 'justify-start', !grouped && 'pt-2')}
                    data-msg
                  >
                    {!mine && (
                      <div className="w-8 shrink-0">
                        {lastOfGroup && <Avatar m={{ name: m.authorName, photo: memberPhoto(m.authorId) ?? m.authorPhoto }} size={32} />}
                      </div>
                    )}
                    {mine && !pending && (
                      <button
                        onClick={() => remove(m.id)}
                        aria-label="Delete message"
                        className={cn(
                          'mb-1 rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground',
                          selected === m.id ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', mine ? 'items-end' : 'items-start')}>
                      {!mine && !grouped && <span className="mb-0.5 ml-1 text-xs font-semibold text-foreground/60">{m.authorName}</span>}
                      <div
                        onClick={() => mine && setSelected((x) => (x === m.id ? null : m.id))}
                        className={cn(
                          'whitespace-pre-wrap break-words',
                          mine && 'cursor-pointer',
                          emojiOnly
                            ? 'text-4xl leading-tight'
                            : cn(
                                'rounded-3xl px-4 py-2 text-[15px] leading-snug',
                                mine ? 'bg-coral text-white' : 'bg-secondary text-foreground',
                                mine && lastOfGroup && 'rounded-br-md',
                                !mine && lastOfGroup && 'rounded-bl-md',
                              ),
                          pending && 'opacity-60',
                        )}
                      >
                        {m.text}
                      </div>
                      {lastOfGroup && <span className="mx-1 mt-0.5 text-[10px] text-muted-foreground">{pending ? 'Sending…' : clock(t)}</span>}
                    </div>
                  </motion.div>
                </Fragment>
              )
            })
          )}
          <AnimatePresence>
            {typing.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2">
                <Avatar m={typing[0]} size={32} />
                <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-secondary px-4 py-3" aria-label="typing">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {typing.map((m) => m.name.split(' ')[0]).join(' & ')} {typing.length > 1 ? 'are' : 'is'} typing…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!atBottom && (
          <button onClick={toBottom} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-lg">
            <ArrowDown className="h-3.5 w-3.5" /> Latest
          </button>
        )}
      </div>

      <div className="border-t p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK.map((e) => (
            <button key={e} onClick={() => send(e)} className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-lg transition hover:scale-110" aria-label={`Send ${e}`}>
              {e}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <textarea
            ref={input}
            rows={1}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Message your group…"
            aria-label="Message"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border bg-secondary/50 px-4 py-2.5 text-[15px] leading-snug focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
            style={{ height: Math.min(128, 44 + Math.max(0, text.split('\n').length - 1) * 20) }}
          />
          <Button type="submit" variant="coral" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!text.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      </div>
    </div>
  )
}
