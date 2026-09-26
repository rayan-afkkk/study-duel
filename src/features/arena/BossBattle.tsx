import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Heart, Skull, Swords, Volume2, VolumeX, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { StudyDoc } from '@/lib/db'
import type { Mcq } from '@shared/schemas'
import { useMcqSet } from '@/lib/questions'
import { AsyncState } from '@/components/AsyncState'
import { Button } from '@/components/ui/button'
import { addMistake } from '@/lib/mistakes'
import { awardXp, incMeta, recordAttempt } from '@/lib/progress'
import { sfx } from '@/lib/sfx'
import { cn, letter, shuffle } from '@/lib/utils'

const BOSS_NAMES = ['Lord Confusion', 'The Exam Dragon', 'Professor Procrastination', 'The Syllabus Titan', 'Count Cramula']

function BossSvg({ hurt, dead, rage }: { hurt: boolean; dead: boolean; rage: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_20px_40px_rgba(238,106,79,0.35)]">
      <defs>
        <radialGradient id="bossBody" cx="40%" cy="35%">
          <stop offset="0%" stopColor={rage ? '#ff8a73' : '#b25bd6'} />
          <stop offset="100%" stopColor={rage ? '#a3261a' : '#4a1f66'} />
        </radialGradient>
      </defs>
      <path d="M50 70 L35 20 L75 55 Z" fill="#E6B54A" />
      <path d="M150 70 L165 20 L125 55 Z" fill="#E6B54A" />
      <path d="M30 120 C30 60 70 40 100 40 C130 40 170 60 170 120 C170 165 140 185 100 185 C60 185 30 165 30 120 Z" fill="url(#bossBody)" />
      {dead ? (
        <g stroke="#fff" strokeWidth="6" strokeLinecap="round">
          <path d="M62 92 L82 112 M82 92 L62 112" />
          <path d="M118 92 L138 112 M138 92 L118 112" />
        </g>
      ) : (
        <g>
          <ellipse cx="72" cy="102" rx="16" ry={hurt ? 4 : 14} fill="#fff" />
          <ellipse cx="128" cy="102" rx="16" ry={hurt ? 4 : 14} fill="#fff" />
          {!hurt && (
            <>
              <circle cx="75" cy="105" r="7" fill="#1a1714" />
              <circle cx="125" cy="105" r="7" fill="#1a1714" />
            </>
          )}
          <path d="M55 80 L88 92" stroke="#1a1714" strokeWidth="6" strokeLinecap="round" />
          <path d="M145 80 L112 92" stroke="#1a1714" strokeWidth="6" strokeLinecap="round" />
        </g>
      )}
      <path d={dead ? 'M70 150 Q100 135 130 150' : 'M65 140 Q100 170 135 140 Z'} fill={dead ? 'none' : '#2a0f0f'} stroke="#2a0f0f" strokeWidth="4" />
      {!dead && (
        <g fill="#fff">
          <path d="M78 143 L84 155 L90 146 Z" />
          <path d="M110 146 L116 155 L122 143 Z" />
        </g>
      )}
    </svg>
  )
}

export function BossBattle({ doc }: { doc: StudyDoc }) {
  const ai = useMcqSet(doc.id, 'boss')
  const [phase, setPhase] = useState<'intro' | 'fight' | 'won' | 'lost'>('intro')
  const [qs, setQs] = useState<Mcq[]>([])
  const [i, setI] = useState(0)
  const [bossHp, setBossHp] = useState(100)
  const [hp, setHp] = useState(100)
  const [picked, setPicked] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [floaters, setFloaters] = useState<{ id: number; text: string; color: string }[]>([])
  const [flash, setFlash] = useState(false)
  const [muted, setMuted] = useState(false)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const boss = useAnimationControls()
  const bossName = useMemo(() => BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)], [])
  const play = (fn: () => void) => !muted && fn()

  const start = () => {
    const pool = shuffle(ai.data?.questions ?? [])
    setQs(pool)
    setI(0)
    setBossHp(100)
    setHp(100)
    setCombo(0)
    setPicked(null)
    setStats({ correct: 0, total: 0 })
    setPhase('fight')
  }

  const dmgPerHit = qs.length ? Math.ceil(100 / Math.max(3, Math.ceil(qs.length * 0.6))) : 20

  const float = (text: string, color: string) => {
    const id = Date.now() + Math.random()
    setFloaters((f) => [...f, { id, text, color }])
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1100)
  }

  const answer = async (k: number) => {
    if (picked !== null) return
    setPicked(k)
    const q = qs[i]
    const ok = k === q.answerIndex
    setStats((st) => ({ correct: st.correct + (ok ? 1 : 0), total: st.total + 1 }))
    let newBoss = bossHp
    let newHp = hp
    if (ok) {
      const dmg = dmgPerHit + combo * 4
      newBoss = Math.max(0, bossHp - dmg)
      setBossHp(newBoss)
      setCombo((c) => c + 1)
      float(`-${dmg}${combo >= 2 ? ' COMBO!' : ''}`, 'text-gold')
      play(sfx.hit)
      boss.start({ x: [0, -16, 14, -10, 8, 0], rotate: [0, -6, 5, -3, 0], transition: { duration: 0.45 } })
    } else {
      newHp = Math.max(0, hp - 25)
      setHp(newHp)
      setCombo(0)
      play(sfx.hurt)
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
      boss.start({ scale: [1, 1.15, 1], transition: { duration: 0.4 } })
      addMistake({ docId: doc.id, source: 'boss', question: q.question, correctAnswer: q.options[q.answerIndex], yourAnswer: q.options[k], explanation: q.explanation, page: q.page, topic: q.topic ?? undefined })
    }
    setTimeout(async () => {
      if (newBoss <= 0 || newHp <= 0 || i + 1 >= qs.length) {
        const won = newBoss <= 0
        setPhase(won ? 'won' : 'lost')
        const correct = stats.correct + (ok ? 1 : 0)
        await recordAttempt({ docId: doc.id, kind: 'boss', correct, total: stats.total + 1 })
        if (won) {
          play(sfx.win)
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#EE6A4F', '#E6B54A', '#B25BD6'] })
          await awardXp(60, 'Boss defeated')
          await incMeta('bossWins')
        } else {
          play(sfx.lose)
          await awardXp(15, 'Boss battle')
        }
        return
      }
      setI(i + 1)
      setPicked(null)
    }, 1300)
  }

  useEffect(() => () => setFloaters([]), [])

  const q = qs[i]

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Summoning the boss…', 'Sharpening its horns…']}>
      <div className={cn('relative overflow-hidden rounded-4xl border bg-gradient-to-b from-plum via-card to-card p-5 md:p-8', flash && 'animate-shake')}>
        <AnimatePresence>{flash && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 bg-coral/40" />}</AnimatePresence>
        <button onClick={() => setMuted(!muted)} className="absolute right-4 top-4 z-10 rounded-full bg-background/40 p-2" aria-label="Toggle sound">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {phase === 'intro' && (
          <div className="flex flex-col items-center py-6 text-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="h-48 w-48">
              <BossSvg hurt={false} dead={false} rage={false} />
            </motion.div>
            <h2 className="mt-4 text-5xl">{bossName}</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Guards the end of <b>{doc.title}</b>. Correct answers deal damage (combos hit harder). Wrong answers cost you ❤️ 25.
            </p>
            <Button size="xl" variant="coral" className="mt-6" onClick={start}>
              <Swords /> Fight!
            </Button>
          </div>
        )}

        {phase === 'fight' && q && (
          <div>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col items-center">
                <div className="mb-3 w-full max-w-xs">
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <Skull className="h-3.5 w-3.5" /> {bossName}
                    </span>
                    <span>{bossHp} HP</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background/50">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" animate={{ width: `${bossHp}%` }} transition={{ type: 'spring', stiffness: 120 }} />
                  </div>
                </div>
                <div className="relative h-44 w-44 md:h-56 md:w-56">
                  <motion.div animate={boss} className="h-full w-full">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="h-full w-full">
                      <BossSvg hurt={picked !== null && picked === q.answerIndex} dead={false} rage={bossHp < 35} />
                    </motion.div>
                  </motion.div>
                  <AnimatePresence>
                    {floaters.map((f) => (
                      <motion.span
                        key={f.id}
                        initial={{ opacity: 1, y: 0, scale: 0.6 }}
                        animate={{ opacity: 0, y: -80, scale: 1.4 }}
                        transition={{ duration: 1 }}
                        className={cn('absolute left-1/2 top-1/3 -translate-x-1/2 whitespace-nowrap font-serif text-4xl font-bold', f.color)}
                      >
                        {f.text}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {[0, 1, 2, 3].map((h) => (
                    <motion.span key={h} animate={{ scale: hp > h * 25 ? 1 : 0.7, opacity: hp > h * 25 ? 1 : 0.25 }}>
                      <Heart className="h-7 w-7 fill-coral text-coral" />
                    </motion.span>
                  ))}
                  {combo >= 2 && (
                    <span className="chip-gold ml-2">
                      <Zap className="h-3 w-3" /> {combo}× combo
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <p className="section-label">
                    Attack {i + 1} / {qs.length}
                  </p>
                  <h3 className="mt-2 font-sans text-xl font-semibold leading-relaxed">{q.question}</h3>
                  <div className="mt-4 grid gap-2.5">
                    {q.options.map((o, k) => {
                      const state = picked === null ? '' : k === q.answerIndex ? 'correct' : k === picked ? 'wrong' : 'dim'
                      return (
                        <motion.button
                          key={k}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => answer(k)}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border bg-background/40 p-3.5 text-left transition hover:border-foreground/40',
                            state === 'correct' && 'border-success bg-success/20',
                            state === 'wrong' && 'border-coral bg-coral/20',
                            state === 'dim' && 'opacity-40',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">{letter(k)}</span>
                          {o}
                        </motion.button>
                      )
                    })}
                  </div>
                  {picked !== null && picked !== q.answerIndex && <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {(phase === 'won' || phase === 'lost') && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6 text-center">
            <div className="h-40 w-40">
              <BossSvg hurt={false} dead={phase === 'won'} rage={phase === 'lost'} />
            </div>
            <h2 className="mt-4 text-6xl">{phase === 'won' ? 'Victory!' : 'Defeated…'}</h2>
            <p className="mt-2 text-muted-foreground">
              {phase === 'won' ? `You slayed ${bossName}! ` : `${bossName} survives — for now. `}
              {stats.correct}/{stats.total} correct.
            </p>
            <p className="mt-1 text-sm text-gold">🪙 +{phase === 'won' ? 60 : 15} XP</p>
            <Button size="lg" variant="coral" className="mt-6" onClick={start}>
              <Swords /> {phase === 'won' ? 'Fight again' : 'Rematch'}
            </Button>
          </motion.div>
        )}
      </div>
    </AsyncState>
  )
}
