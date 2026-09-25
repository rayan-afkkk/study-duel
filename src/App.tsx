import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Workspace = lazy(() => import('./pages/Workspace'))
const StudyPlan = lazy(() => import('./pages/StudyPlan'))
const Mistakes = lazy(() => import('./pages/Mistakes'))
const Groups = lazy(() => import('./pages/Groups'))
const GroupDetail = lazy(() => import('./pages/GroupDetail'))
const LiveBattle = lazy(() => import('./pages/LiveBattle'))
const Join = lazy(() => import('./pages/Join'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
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

  const bare = location.pathname === '/' || location.pathname.startsWith('/battle/')

  const routes = (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <DocViewerProvider>
        <CallProvider>
          <ErrorBoundary>
            <Suspense fallback={<Fallback />}>{bare ? routes : <AppShell>{routes}</AppShell>}</Suspense>
          </ErrorBoundary>
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
