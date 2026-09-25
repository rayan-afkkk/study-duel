import { Pause, Play, Square, Volume2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { TeacherAvatar } from './TeacherAvatar'
import type { useReadAloud } from '@/hooks/useReadAloud'
import { ttsSupported } from '@/lib/speech'
import { cn } from '@/lib/utils'

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function ReadAloudBar({ ctrl, label, total, className }: { ctrl: ReturnType<typeof useReadAloud>; label?: string; total: number; className?: string }) {
  if (!ttsSupported()) return null
  const speaking = ctrl.state === 'playing'
  return (
    <motion.div
      layout
      className={cn('surface flex flex-wrap items-center gap-3 p-3 pr-4 md:flex-nowrap md:gap-4', speaking && 'border-coral/50', className)}
    >
      <TeacherAvatar speaking={speaking} pulse={ctrl.pulse} size={speaking ? 64 : 52} />
      <div className="min-w-[140px] flex-1 basis-0">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Volume2 className="h-4 w-4 text-coral" /> {label ?? 'Read aloud'}
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {ctrl.state === 'stopped'
            ? 'Ms. Noor will read this to you — the current sentence is highlighted.'
            : `Sentence ${Math.max(1, ctrl.index + 1)} of ${total}`}
        </p>
      </div>
      <div className="order-last flex w-full items-center justify-center gap-1 rounded-full bg-secondary p-1 md:order-none md:w-auto">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => ctrl.setRate(s)}
            className={cn('rounded-full px-2.5 py-1 text-xs font-semibold transition', ctrl.rate === s ? 'bg-background text-foreground' : 'text-muted-foreground')}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {ctrl.state === 'playing' ? (
          <Button size="icon" variant="coral" onClick={ctrl.pause} aria-label="Pause">
            <Pause />
          </Button>
        ) : (
          <Button size="icon" variant="coral" onClick={() => (ctrl.state === 'paused' ? ctrl.resume() : ctrl.play())} aria-label="Play">
            <Play />
          </Button>
        )}
        {ctrl.state !== 'stopped' && (
          <Button size="icon" variant="secondary" onClick={ctrl.stop} aria-label="Stop">
            <Square />
          </Button>
        )}
      </div>
    </motion.div>
  )
}
