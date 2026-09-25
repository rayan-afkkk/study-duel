import { useRef } from 'react'
import { cn } from '@/lib/utils'

/** 6-digit invite code input with individual boxes (great on phones). */
export function CodeInput({ value, onChange, onComplete, className }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; className?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')
  const set = (i: number, d: string) => {
    const arr = value.padEnd(6, ' ').slice(0, 6).split('')
    arr[i] = d || ' '
    const next = arr.join('').replace(/\s+$/, '')
    onChange(next)
    if (next.replace(/\s/g, '').length === 6) onComplete?.(next)
  }
  return (
    <div className={cn('flex justify-center gap-2', className)}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (v.length > 1) {
              const full = v.slice(0, 6)
              onChange(full)
              if (full.length === 6) onComplete?.(full)
              refs.current[Math.min(full.length, 5)]?.focus()
              return
            }
            set(i, v)
            if (v && i < 5) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus()
          }}
          className="h-14 w-11 rounded-2xl border bg-secondary/50 text-center font-serif text-3xl focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/40 sm:w-14"
        />
      ))}
    </div>
  )
}
