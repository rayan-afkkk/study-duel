import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Sparkles, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

const DEFAULT_MESSAGES = [
  'Brewing some chai for the AI…',
  'Reading your chapter carefully…',
  'Sharpening pencils…',
  'Asking the smartest kid in class…',
  'Drawing diagrams on the whiteboard…',
  'Making it simple enough for a 12-year-old…',
  'Almost there — checking the page numbers…',
]

export function LoadingMessages({ messages = DEFAULT_MESSAGES }: { messages?: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 2200)
    return () => clearInterval(t)
  }, [messages.length])
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }} className="text-gold">
        <Sparkles className="h-4 w-4" />
      </motion.span>
      <AnimatePresence mode="wait">
        <motion.span key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {messages[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export function SkeletonBlock({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${92 - ((i * 13) % 35)}%` }} />
      ))}
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function ErrorCard({ error, onRetry, extra }: { error?: string; onRetry?: () => void; extra?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-soft text-coral">
        <WifiOff className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-2xl">Oops — the AI tripped over its shoelaces</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{friendly(error)}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="coral">
            <RefreshCw /> Try again
          </Button>
        )}
        {extra}
      </div>
    </motion.div>
  )
}

function friendly(e?: string) {
  if (!e) return 'Something went wrong. Please try again.'
  if (/No AI provider configured/i.test(e)) return 'No AI keys are set up yet. Add them to your .env (see README) — or try the demo chapter, which works fully offline.'
  if (/All AI providers failed/i.test(e)) return 'Every AI provider is busy or out of quota right now. Give it a few seconds and try again.'
  return e
}

export function AsyncState({
  status,
  error,
  onRetry,
  children,
  idle,
  loading,
  messages,
}: {
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
  onRetry?: () => void
  children: ReactNode
  idle?: ReactNode
  loading?: ReactNode
  messages?: string[]
}) {
  if (status === 'error') return <ErrorCard error={error} onRetry={onRetry} />
  if (status === 'loading')
    return (
      <div className="surface space-y-6 p-6 md:p-8">
        <LoadingMessages messages={messages} />
        {loading ?? <SkeletonBlock />}
      </div>
    )
  if (status === 'idle') return <>{idle ?? null}</>
  return <>{children}</>
}

export function GenerateCTA({
  title,
  desc,
  onGenerate,
  icon,
  children,
}: {
  title: string
  desc: string
  onGenerate: () => void
  icon?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="dashed-card flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft text-coral [&_svg]:h-7 [&_svg]:w-7">
        {icon ?? <Sparkles />}
      </div>
      <div>
        <h3 className="text-3xl">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
      <Button variant="coral" size="lg" onClick={onGenerate}>
        <Sparkles /> Generate
      </Button>
    </div>
  )
}
