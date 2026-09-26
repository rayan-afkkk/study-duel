import { useEffect, useRef, type ReactNode } from 'react'
import { Slider } from '@/components/ui/slider'

export const C = { coral: '#EE6A4F', gold: '#E6B54A', blue: '#6FA8DC', green: '#6FCF97', purple: '#B39DDB' }

/** Canvas animation loop with DPR scaling. draw(ctx, w, h, dt, t, fg). */
export function useCanvasLoop(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, t: number, fg: string) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let t = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      // skip frames while the canvas is still being laid out (0-width panels → negative radii)
      if (w >= 60 && h >= 60) {
        try {
          drawRef.current(ctx, w, h, dt, t, getComputedStyle(canvas).color)
        } catch (err) {
          console.warn('[sim] frame skipped', err)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

export function Param({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {Number.isInteger(step) ? value : value.toFixed(step < 0.1 ? 2 : 1)} {unit}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}

export function Readout({ label, value, formula }: { label: string; value: string; formula?: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {formula && <p className="font-mono text-[11px] text-gold">{formula}</p>}
    </div>
  )
}

/** Small on/off pill for simulations. */
export function Toggle({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <div className="flex gap-1 rounded-full bg-secondary p-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Particles bouncing in a box — shared by several chemistry sims. */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  kind?: number
}

export function spawn(n: number, w: number, h: number, speed: number, kind = 0): Particle[] {
  return Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2
    return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, kind }
  })
}

export function SimShell({ canvas, controls, readouts, note }: { canvas: ReactNode; controls: ReactNode; readouts: ReactNode; note?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="surface overflow-hidden">
        <div className="h-[360px] w-full text-foreground md:h-[440px]">{canvas}</div>
      </div>
      <div className="space-y-4">
        <div className="surface space-y-5 p-5">{controls}</div>
        <div className="grid grid-cols-2 gap-2">{readouts}</div>
        {note && <p className="px-1 text-xs leading-relaxed text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}

export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, label?: string) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 2) return
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4))
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4))
  ctx.fill()
  if (label) {
    ctx.font = '600 12px DM Sans, sans-serif'
    ctx.fillText(label, x2 + 6, y2 - 6)
  }
}
