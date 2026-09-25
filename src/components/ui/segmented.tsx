import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Pill segmented control (the "System / Light / Dark" style). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  const id = useId()
  return (
    <div className={cn('no-scrollbar flex w-full items-center overflow-x-auto rounded-full border bg-card p-1.5', className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors',
              size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm',
              active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full border border-border/60 bg-secondary shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
              />
            )}
            <span className="relative flex items-center gap-2 [&_svg]:size-4">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
