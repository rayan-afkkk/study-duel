import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import confetti from 'canvas-confetti'
import { ArrowLeft, Check, Crown, Loader2, Play, SkipForward, Users, X } from 'lucide-react'
import { useAuth } from '@/lib/firebase'
import { useCollection, useDoc } from '@/hooks/useFirestore'
import {
  battlePoints,
  battleRef,
  endBattle,
  groupRef,
  joinBattle,
  joinUrl,
  playersCol,
  setBattle,
  submitAnswer,
  type Battle,
  type Group,
  type Player,
} from '@/lib/groups'
import { Button } from '@/components/ui/button'
import { SignInCard } from '@/components/SignInCard'
import { ErrorCard } from '@/components/AsyncState'
import { Avatar } from '@/features/group/Leaderboard'
import { sfx } from '@/lib/sfx'
import { awardXp, incMeta, recordAttempt } from '@/lib/progress'
import { cn } from '@/lib/utils'

const TILES = [
  { bg: 'bg-[#E0533A]', shape: '▲' },
  { bg: 'bg-[#D69E2E]', shape: '◆' },
  { bg: 'bg-[#3F7FC4]', shape: '●' },
  { bg: 'bg-[#2F9E6A]', shape: '■' },
]

export default function LiveBattle() {
  const { gid = '', bid = '' } = useParams()
  const { user, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-24 animate-spin" />
  if (!user)
    return (
      <div className="p-4 pt-16">
        <SignInCard title="Join the battle" desc="Sign in with Google to play." />
      </div>
    )
  return <Arena gid={gid} bid={bid} uid={user.uid} />
}

function Arena({ gid, bid, uid }: { gid: string; bid: string; uid: string }) {
  const { user } = useAuth()
  const battle = useDoc<Battle>(battleRef(gid, bid), [gid, bid])
  const group = useDoc<Group>(groupRef(gid), [gid])
  const players = useCollection<Player>(playersCol(gid, bid), [gid, bid])
  const [, tick] = useState(0)
  const receivedAt = useRef(Date.now())
  const lastQ = useRef(-1)
  const advanced = useRef<string>('')
  const finished = useRef(false)

  const b = battle.data
  const isHost = b?.hostId === uid
  const q = b && b.current >= 0 ? b.questions[b.current] : undefined
  const list = useMemo(() => [...(players.data ?? [])].sort((x, y) => y.score - x.score), [players.data])
  const me = list.find((p) => p.id === uid)
  const myAnswer = b ? me?.answers?.[String(b.current)] : undefined
  const answeredCount = b ? list.filter((p) => p.answers?.[String(b.current)]).length : 0

  useEffect(() => {
    if (user && b && b.status !== 'final') joinBattle(gid, bid, user).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, !!b])

  // Each device times the question from when IT received it — avoids clock skew between phones.
  if (b && b.status === 'question' && b.current !== lastQ.current) {
    lastQ.current = b.current
    receivedAt.current = Date.now()
  }

  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 200)
    return () => clearInterval(t)
  }, [])

  const timeLeft = b ? Math.max(0, b.duration - (Date.now() - receivedAt.current) / 1000) : 0

  // Host drives the state machine: question → reveal when all answered or time is up.
  useEffect(() => {
    if (!isHost || !b || b.status !== 'question') return
    const key = `reveal-${b.current}`
    if (advanced.current === key) return
    if (timeLeft <= 0 || (list.length > 0 && answeredCount >= list.length)) {
      advanced.current = key
      setTimeout(() => setBattle(gid, bid, { status: 'reveal' }), 600)
    }
  })

  const next = async () => {
    if (!b) return
    if (b.current + 1 >= b.questions.length) await endBattle(gid, bid)
    else await setBattle(gid, bid, { status: 'question', current: b.current + 1, questionStartedAt: Date.now() })
  }

  // Auto-advance from the leaderboard after a few seconds (host only).
  useEffect(() => {
    if (!isHost || b?.status !== 'reveal') return
    const t = setTimeout(next, 7000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, b?.status, b?.current])

  // Sounds on reveal
  useEffect(() => {
    if (b?.status === 'reveal' && q) myAnswer?.correct ? sfx.correct() : sfx.wrong()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.status, b?.current])

  // Finale: confetti for the winner + local XP/attempt (once per battle)
  useEffect(() => {
    if (b?.status !== 'final' || finished.current || !list.length) return
    finished.current = true
    const winner = list[0]
    confetti({ particleCount: 220, spread: 110, origin: { y: 0.55 }, colors: ['#EE6A4F', '#E6B54A', '#F4EDE1', '#3F7FC4'] })
    sfx.win()
    const key = `sd-battle-${bid}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
    const correct = Object.values(me?.answers ?? {}).filter((a) => a.correct).length
    recordAttempt({ docId: `battle:${gid}`, kind: 'battle', correct, total: b.questions.length })
    if (winner.id === uid) {
      incMeta('battlesWon')
      awardXp(100, 'Won a live battle')
    } else awardXp(30, 'Played a live battle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.status, list.length])

  const answer = (k: number) => {
    if (!b || !q || myAnswer || timeLeft <= 0) return
    sfx.click()
    const ms = Date.now() - receivedAt.current
    const correct = k === q.answerIndex
    submitAnswer(gid, bid, uid, b.current, k, correct, battlePoints(correct, ms, b.duration), ms)
  }

  if (battle.error) return <div className="p-4 pt-16"><ErrorCard error="You need to be in this group to join its battle. Use the invite code or QR." extra={<Button asChild variant="secondary"><Link to="/join">Enter code</Link></Button>} /></div>
  if (!b) return battle.data === null ? <div className="p-4 pt-16"><ErrorCard error="This battle has ended or doesn't exist." extra={<Button asChild variant="secondary"><Link to={`/groups/${gid}`}>Back to group</Link></Button>} /></div> : <Loader2 className="mx-auto mt-24 animate-spin" />

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-plum/60 via-background to-background">
      <header className="flex items-center justify-between px-4 py-3 md:px-8">
        <Link to={`/groups/${gid}`} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
        </Link>
        <p className="truncate px-2 font-serif text-2xl">{b.title}</p>
        <span className="chip-muted">
          <Users className="h-3 w-3" /> {list.length}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 md:px-8">
        {/* LOBBY */}
        {b.status === 'lobby' && (
          <div className="grid flex-1 items-center gap-8 md:grid-cols-2">
            <div className="text-center md:text-left">
              <p className="section-label">Waiting room</p>
              <h1 className="mt-2 text-6xl leading-none md:text-7xl">Get ready to duel!</h1>
              <p className="mt-3 text-muted-foreground">{b.questions.length} questions · {b.duration}s each · faster = more points</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                <AnimatePresence>
                  {list.map((p) => (
                    <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-4">
                      <Avatar m={p} size={32} />
                      <span className="text-sm font-semibold">{p.name.split(' ')[0]}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {isHost ? (
                <Button size="xl" variant="coral" className="mt-8" onClick={() => setBattle(gid, bid, { status: 'question', current: 0, questionStartedAt: Date.now() })}>
                  <Play /> Start battle
                </Button>
              ) : (
                <p className="mt-8 flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <Loader2 className="h-4 w-4 animate-spin" /> Waiting for {b.hostName.split(' ')[0]} to start…
                </p>
              )}
            </div>
            {group.data && (
              <div className="surface mx-auto flex flex-col items-center p-6 text-center">
                <p className="text-sm text-muted-foreground">Join from your phone</p>
                <div className="mt-3 rounded-2xl bg-white p-4">
                  <QRCodeSVG value={joinUrl(group.data.inviteCode)} size={180} />
                </div>
                <p className="mt-3 font-serif text-4xl tracking-[0.2em]">{group.data.inviteCode}</p>
              </div>
            )}
          </div>
        )}

        {/* QUESTION */}
        {b.status === 'question' && q && (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between py-2">
              <span className="chip-muted">
                {b.current + 1} / {b.questions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{list.length} answered
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div className={cn('h-full', timeLeft < 5 ? 'bg-coral' : 'bg-gold')} style={{ width: `${(timeLeft / b.duration) * 100}%` }} />
            </div>
            <motion.div key={b.current} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="surface my-5 flex min-h-[120px] items-center justify-center p-6 text-center">
              <h2 className="font-sans text-xl font-bold leading-snug md:text-3xl">{q.question}</h2>
            </motion.div>
            <div className="mb-3 text-center font-serif text-5xl tabular-nums">{Math.ceil(timeLeft)}</div>
            {myAnswer ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center text-center">
                <div className={cn('flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white', TILES[myAnswer.choice].bg)}>{TILES[myAnswer.choice].shape}</div>
                <p className="mt-4 text-2xl font-bold">Answer locked in!</p>
                <p className="text-muted-foreground">Waiting for the others…</p>
              </motion.div>
            ) : (
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <motion.button
                    key={k}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => answer(k)}
                    disabled={timeLeft <= 0}
                    className={cn('flex min-h-[72px] items-center gap-4 rounded-3xl p-5 text-left text-lg font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 md:min-h-[110px]', TILES[k].bg)}
                  >
                    <span className="text-3xl">{TILES[k].shape}</span>
                    {o}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REVEAL + LEADERBOARD */}
        {b.status === 'reveal' && q && (
          <div className="flex flex-1 flex-col gap-5 py-4">
            <div className="surface p-5">
              <p className="text-sm text-muted-foreground">{q.question}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full text-xl text-white', TILES[q.answerIndex].bg)}>{TILES[q.answerIndex].shape}</span>
                <p className="text-xl font-bold">{q.options[q.answerIndex]}</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>
            </div>
            {(
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn('flex items-center justify-center gap-3 rounded-3xl p-4 text-xl font-bold text-white', myAnswer?.correct ? 'bg-success' : 'bg-coral')}
              >
                {myAnswer?.correct ? <Check /> : <X />}
                {myAnswer?.correct ? `Correct! +${myAnswer.points}` : myAnswer ? 'Not this time' : 'Too slow!'}
              </motion.div>
            )}
            <div className="space-y-2">
              <p className="section-label">Leaderboard</p>
              {list.map((p, i) => {
                const a = p.answers?.[String(b.current)]
                return (
                  <motion.div key={p.id} layout transition={{ type: 'spring', stiffness: 200, damping: 25 }} className={cn('surface flex items-center gap-3 p-4', p.id === uid && 'border-coral/60')}>
                    <span className="w-6 text-center font-serif text-2xl">{i + 1}</span>
                    <Avatar m={p} size={36} />
                    <span className="flex-1 truncate font-semibold">{p.name}</span>
                    {a?.correct && <span className="text-sm text-success">+{a.points}</span>}
                    <span className="w-20 text-right text-lg font-bold tabular-nums">{p.score}</span>
                  </motion.div>
                )
              })}
            </div>
            {isHost && (
              <Button size="lg" variant="coral" className="mt-auto self-center" onClick={next}>
                {b.current + 1 >= b.questions.length ? 'Show final results' : 'Next question'} <SkipForward />
              </Button>
            )}
          </div>
        )}

        {/* FINAL */}
        {b.status === 'final' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Crown className="h-14 w-14 text-gold" />
            <h1 className="mt-2 text-6xl md:text-7xl">{list[0]?.id === uid ? 'You won! 🎉' : `${list[0]?.name.split(' ')[0] ?? 'Someone'} wins!`}</h1>
            <div className="mt-10 flex items-end justify-center gap-3">
              {[1, 0, 2].map((pos) => {
                const p = list[pos]
                if (!p) return <div key={pos} className="w-24" />
                const h = pos === 0 ? 170 : pos === 1 ? 120 : 90
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + (2 - pos) * 0.3 }} className="flex w-24 flex-col items-center md:w-32">
                    <Avatar m={p} size={pos === 0 ? 72 : 56} className={cn('border-4', pos === 0 ? 'border-gold' : 'border-card')} />
                    <p className="mt-2 w-full truncate text-sm font-semibold">{p.name.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground">{p.score} pts</p>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: h }}
                      transition={{ delay: 0.3 + (2 - pos) * 0.3, type: 'spring', stiffness: 70 }}
                      className={cn('mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 font-serif text-4xl', pos === 0 ? 'bg-gold text-black' : pos === 1 ? 'bg-secondary' : 'bg-wine')}
                    >
                      {pos + 1}
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
            <Button asChild size="lg" variant="secondary" className="mt-10">
              <Link to={`/groups/${gid}`}>Back to group</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
