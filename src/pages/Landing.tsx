import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  AudioLines,
  Brain,
  FileText,
  FlaskConical,
  Headphones,
  Layers,
  Map as MapIcon,
  MonitorUp,
  PenLine,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/AppShell'
import { TeacherAvatar } from '@/components/TeacherAvatar'
import { loadDemoData, DEMO_ID } from '@/lib/demo'
import { displayName, signInWithGoogle, useAuth } from '@/lib/firebase'
import { toast } from 'sonner'
import { useState } from 'react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const FEATURES = [
  { icon: FileText, title: 'Explanations with citations', desc: 'Topic-by-topic, simple enough for a 12-year-old, with diagrams and a “Page X” badge for every claim.', color: 'bg-ocean' },
  { icon: Layers, title: 'Flashcards that remember', desc: 'SM-2 spaced repetition with Again / Hard / Easy.', color: 'bg-card' },
  { icon: Swords, title: 'Boss battles', desc: 'Defeat the chapter boss — correct answers deal damage.', color: 'bg-wine' },
  { icon: Headphones, title: 'Podcast mode', desc: 'Two AI hosts turn your chapter into a fun conversation.', color: 'bg-plum' },
  { icon: MapIcon, title: 'Interactive mind maps', desc: 'The whole chapter as a map. Click any node to learn it.', color: 'bg-moss' },
  { icon: FlaskConical, title: 'Experiment lab', desc: 'Pendulums, projectiles and circuits with live sliders.', color: 'bg-ocean' },
  { icon: PenLine, title: 'Handwriting grading', desc: 'Snap your written answer, get board-style marks.', color: 'bg-card' },
  { icon: Trophy, title: 'Live battles', desc: 'Kahoot-style quizzes with friends — even from phones.', color: 'bg-wine' },
]

export default function Landing() {
  const nav = useNavigate()
  const { user, enabled } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const login = async () => {
    if (user) return nav('/app')
    setSigningIn(true)
    try {
      await signInWithGoogle()
      nav('/app')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSigningIn(false)
    }
  }
  const demo = async () => {
    await loadDemoData()
    nav(`/doc/${DEMO_ID}`)
  }
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={demo}>
            Try demo
          </Button>
          {user ? (
            <Button asChild>
              <Link to="/app">
                {user.photoURL && <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="h-6 w-6 rounded-full" />}
                Hi {displayName(user).split(' ')[0]} · Open app <ArrowRight />
              </Link>
            </Button>
          ) : enabled ? (
            <Button onClick={login} disabled={signingIn}>
              <GoogleIcon /> Log in
            </Button>
          ) : (
            <Button asChild>
              <Link to="/app">
                Open app <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip-gold">
            <Sparkles className="h-3.5 w-3.5" /> AI study buddy for Matric, FSc & O-Levels
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 text-6xl leading-[0.95] sm:text-7xl lg:text-8xl"
          >
            Study smarter.
            <br />
            <em className="text-coral">Duel</em> your friends.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 max-w-xl text-lg text-muted-foreground">
            Drop in any chapter — PDF, photo or notes. StudyDuel explains it simply, quizzes you, reads it aloud in English, Urdu or Roman Urdu, and lets
            you battle your friends live with voice chat.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
            {enabled && !user ? (
              <Button size="xl" variant="coral" onClick={login} disabled={signingIn}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                  <GoogleIcon />
                </span>
                {signingIn ? 'Signing in…' : 'Continue with Google'}
              </Button>
            ) : (
              <Button size="xl" variant="coral" asChild>
                <Link to="/app">
                  {user ? 'Go to my dashboard' : 'Start studying free'} <ArrowRight />
                </Link>
              </Button>
            )}
            <Button size="xl" variant="secondary" onClick={demo}>
              <FlaskConical /> Load demo chapter
            </Button>
          </motion.div>
          {enabled && !user && (
            <p className="mt-3 text-sm text-muted-foreground">
              or{' '}
              <Link to="/app" className="text-foreground underline underline-offset-4 hover:text-coral">
                continue as a guest
              </Link>{' '}
              — sign in later to join groups & battles.
            </p>
          )}
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <AudioLines className="h-4 w-4 text-coral" /> Voice calls & screen share
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-coral" /> Groups of 3
            </span>
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-coral" /> Works offline with demo
            </span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative mx-auto h-[460px] w-full max-w-[520px]">
          <motion.div
            initial={{ opacity: 0, rotate: -8, y: 30 }}
            animate={{ opacity: 1, rotate: -6, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute left-0 top-6 w-64 rounded-3xl border bg-ocean p-5 shadow-2xl"
          >
            <FlaskConical className="h-10 w-10 stroke-[1.4]" />
            <p className="mt-4 text-lg font-bold">Newton’s Second Law</p>
            <p className="mt-1 text-sm text-foreground/60">Push a 4 kg box with 20 N and it accelerates at 5 m/s²…</p>
            <div className="mt-4 flex justify-between">
              <span className="chip-gold">📄 Page 3</span>
              <span className="text-xs text-foreground/50">F = ma</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, rotate: 8, y: 30 }}
            animate={{ opacity: 1, rotate: 5, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute right-0 top-28 w-64 rounded-3xl border bg-card p-5 shadow-2xl"
          >
            <p className="section-label">Live battle</p>
            {[
              ['Ayesha', 2840, 'bg-coral'],
              ['You', 2610, 'bg-gold'],
              ['Bilal', 1990, 'bg-ocean'],
            ].map(([n, s, c], i) => (
              <div key={n as string} className="mt-3 flex items-center gap-3">
                <span className="w-4 text-sm text-muted-foreground">{i + 1}</span>
                <span className={`h-8 w-8 rounded-full ${c}`} />
                <span className="flex-1 text-sm font-semibold">{n}</span>
                <span className="text-sm tabular-nums">{s}</span>
              </div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-0 left-10 flex w-72 items-center gap-4 rounded-3xl border bg-wine p-4 shadow-2xl"
          >
            <TeacherAvatar speaking size={64} />
            <div>
              <p className="text-sm font-bold">Ms. Noor is reading…</p>
              <p className="text-xs text-foreground/60">“Inertia is the tendency of a body to resist change.”</p>
            </div>
          </motion.div>
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="chip-gold absolute right-8 top-2 text-sm shadow-lg"
          >
            🪙 +50 XP
          </motion.span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-10">
        <h2 className="text-5xl md:text-6xl">Everything you need to ace the exam</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-3xl border p-6 ${f.color}`}
            >
              <f.icon className="h-9 w-9 stroke-[1.5]" />
              <h3 className="mt-5 font-sans text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-foreground/65">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
        <div className="surface grid items-center gap-8 p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <h2 className="text-5xl">Study together, even when apart</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Create a group with your two best study buddies, share chapters and flashcards, post doubts that the AI answers first, run a shared Pomodoro
              focus room, and hop on a voice call with screen sharing — all without leaving the page you’re studying.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-soft text-coral">
              <Users />
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
              <AudioLines />
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <MonitorUp />
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">Made with ☕ for students · StudyDuel</footer>
    </div>
  )
}
