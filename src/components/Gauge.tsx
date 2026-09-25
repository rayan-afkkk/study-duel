import { motion } from 'framer-motion'

/** Semi-circular readiness gauge. */
export function Gauge({ value, size = 220, label }: { value: number | null; size?: number; label?: string }) {
  const r = size / 2 - 16
  const c = Math.PI * r
  const v = value ?? 0
  const color = v >= 75 ? 'hsl(var(--success))' : v >= 50 ? 'hsl(var(--gold))' : 'hsl(var(--coral))'
  return (
    <div className="relative" style={{ width: size, height: size / 2 + 24 }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M 16 ${size / 2} A ${r} ${r} 0 0 1 ${size - 16} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <motion.path
          d={`M 16 ${size / 2} A ${r} ${r} 0 0 1 ${size - 16} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="font-serif text-6xl leading-none">{value === null ? '—' : `~${value}%`}</span>
        {label && <span className="mt-1 text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}
