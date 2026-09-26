import { Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { AppShell } from './components/layout/AppShell'
import { DocViewerProvider } from './components/DocViewer'
import { CallProvider } from './components/call/CallProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { SkeletonBlock } from './components/AsyncState'
import { PROGRESS_EVENT } from './lib/progress'
import { scheduleStatsSync } from './lib/groups'
import { useSettings } from './lib/settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import { lazyPage, preloadPages } from './lib/lazyPage'

const Landing = lazyPage(() => import('./pages/Landing'))
const Dashboard = lazyPage(() => import('./pages/Dashboard'))
const Workspace = lazyPage(() => import('./pages/Workspace'))
const StudyPlan = lazyPage(() => import('./pages/StudyPlan'))
const Mistakes = lazyPage(() => import('./pages/Mistakes'))
const Groups = lazyPage(() => import('./pages/Groups'))
const GroupDetail = lazyPage(() => import('./pages/GroupDetail'))
const LiveBattle = lazyPage(() => import('./pages/LiveBattle'))
const Join = lazyPage(() => import('./pages/Join'))
const Profile = lazyPage(() => import('./pages/Profile'))
const NotFound = lazyPage(() => import('./pages/NotFound'))

/** Enter-only page animation: the new page appears immediately (no waiting for the old one to fade out). */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

const Fallback = () => (
  <div className="mx-auto max-w-5xl p-8">
    <SkeletonBlock />
  </div>
)

export default function App() {
  const location = useLocation()
  const { theme } = useSettings()

  useEffect(() => {
    const onProgress = () => scheduleStatsSync()
    window.addEventListener(PROGRESS_EVENT, onProgress)
    return () => window.removeEventListener(PROGRESS_EVENT, onProgress)
  }, [])

  useEffect(() => window.scrollTo(0, 0), [location.pathname])

  // Download every page in the background after first load, so switching pages is instant.
  useEffect(() => preloadPages(), [])

  const bare = location.pathname === '/' || location.pathname.startsWith('/battle/')

  // Suspense + ErrorBoundary sit INSIDE the shell (so the sidebar never disappears while a page loads).
  // The boundary stays mounted across page changes (so it also catches errors while the old page is torn
  // down) and simply resets when the URL changes.
  const routes = (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Page><Dashboard /></Page>} />
        <Route path="/doc/:id" element={<Page><Workspace /></Page>} />
        <Route path="/plan" element={<Page><StudyPlan /></Page>} />
        <Route path="/mistakes" element={<Page><Mistakes /></Page>} />
        <Route path="/groups" element={<Page><Groups /></Page>} />
        <Route path="/groups/:gid" element={<Page><GroupDetail /></Page>} />
        <Route path="/battle/:gid/:bid" element={<LiveBattle />} />
        <Route path="/join" element={<Page><Join /></Page>} />
        <Route path="/join/:code" element={<Page><Join /></Page>} />
        <Route path="/profile" element={<Page><Profile /></Page>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <DocViewerProvider>
        <CallProvider>
          {bare ? routes : <AppShell>{routes}</AppShell>}
          <Toaster
            theme={theme === 'light' ? 'light' : 'dark'}
            position="top-center"
            toastOptions={{ className: '!rounded-2xl !border-border !bg-card !text-foreground !font-sans' }}
          />
        </CallProvider>
      </DocViewerProvider>
    </TooltipProvider>
  )
}
