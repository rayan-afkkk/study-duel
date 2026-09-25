import { NavLink, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookX, CalendarDays, Home, Moon, Sun, Swords, User, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { setSettings, useSettings } from '@/lib/settings'
import { useStats } from '@/hooks/useStats'
import { useAuth, displayName } from '@/lib/firebase'

const NAV = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/mistakes', label: 'Mistakes', icon: BookX },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/profile', label: 'Account', icon: User },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/app" className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral text-white shadow-lg shadow-coral/30">
        <Swords className="h-5 w-5" />
      </span>
      <span className="font-serif text-3xl leading-none">StudyDuel</span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const stats = useStats()
  const { theme } = useSettings()
  const { user } = useAuth()
  const isDark = document.documentElement.classList.contains('dark')
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar (laptop-first) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r bg-background px-5 py-7 lg:flex">
        <Logo />
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-secondary" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
                  <Icon className="relative h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          {stats && (
            <div className="surface p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Level {stats.level}</span>
                <span className="chip-gold">🪙 {stats.totalXp} XP</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${stats.levelProgress * 100}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">🔥 {stats.streak}-day streak</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {user?.photoURL ? (
                <img src={user.photoURL} className="h-8 w-8 rounded-full" alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </span>
              )}
              <span className="truncate">{user ? displayName(user) : 'Guest'}</span>
            </Link>
            <button
              onClick={() => setSettings({ theme: isDark ? 'light' : 'dark' })}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
              data-theme={theme}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        {stats && <span className="chip-gold">🪙 {stats.totalXp}</span>}
      </header>

      <main className="lg:pl-[264px]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:px-8 lg:pb-12 lg:pt-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center gap-1 pb-2 text-[11px] transition-colors', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.6} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
