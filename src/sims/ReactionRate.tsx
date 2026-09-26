import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, Toggle, spawn, useCanvasLoop, type Particle } from './SimShell'

/** Collision theory: A + B → product only when they collide with enough energy (≥ activation energy). */
export default function ReactionRate() {
  const [T, setT] = useState(30)
  const [conc, setConc] = useState(20)
  const [cat, setCat] = useState('off')
  const parts = useRef<Particle[]>([])
  const products = useRef<{ x: number; y: number; life: number }[]>([])
  const log = useRef<number[]>([])
  const [rate, setRate] = useState(0)
  const Ea = cat === 'on' ? 0.35 : 0.7

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      const speed = 40 + T * 3
      const n = conc * 2
      if (parts.current.length !== n) parts.current = [...spawn(conc, w, h, speed, 0), ...spawn(conc, w, h, speed, 1)]
      for (const p of parts.current) {
        const sp = Math.hypot(p.vx, p.vy) || 1
        p.vx = (p.vx / sp) * speed * (0.6 + Math.random() * 0.8)
        p.vy = (p.vy / sp) * speed * (0.6 + Math.random() * 0.8)
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < 8 || p.x > w - 8) p.vx *= -1
        if (p.y < 8 || p.y > h - 8) p.vy *= -1
        p.x = Math.min(w - 8, Math.max(8, p.x))
        p.y = Math.min(h - 8, Math.max(8, p.y))
      }
      // collisions A–B
      for (let i = 0; i < parts.current.length; i++) {
        const a = parts.current[i]
        if (a.kind !== 0) continue
        for (let j = 0; j < parts.current.length; j++) {
          const b = parts.current[j]
          if (b.kind !== 1) continue
          if (Math.hypot(a.x - b.x, a.y - b.y) < 14) {
            // Arrhenius-style chance: only a fraction of collisions have energy ≥ Ea; hotter → bigger fraction
            const chance = Math.exp(-(Ea * 6) / (0.5 + T / 50))
            if (Math.random() < chance * dt * 20) {
              products.current.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, life: 1 })
              log.current.push(t)
              // respawn reactants so concentration stays the same
              a.x = Math.random() * w
              a.y = Math.random() * h
              b.x = Math.random() * w
              b.y = Math.random() * h
            }
          }
        }
      }
      log.current = log.current.filter((x) => t - x < 5)
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) setRate(log.current.length / 5)
      for (const p of parts.current) {
        ctx.fillStyle = p.kind === 0 ? C.coral : C.blue
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      products.current = products.current.filter((p) => (p.life -= dt * 0.8) > 0)
      for (const p of products.current) {
        ctx.globalAlpha = p.life
        ctx.fillStyle = C.gold
        ctx.beginPath()
        ctx.arc(p.x, p.y, 10 + (1 - p.life) * 16, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('● A   ● B   ✦ successful collision → product', 12, h - 12)
    },
    [T, conc, cat],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Temperature" value={T} unit="°C" min={0} max={150} step={5} onChange={setT} />
          <Param label="Concentration" value={conc} unit="particles" min={5} max={40} step={1} onChange={setConc} />
          <Toggle label="Catalyst" value={cat} onChange={setCat} options={[{ value: 'off', label: 'None' }, { value: 'on', label: 'Add catalyst' }]} />
        </>
      }
      readouts={
        <>
          <Readout label="Reaction rate" value={`${rate.toFixed(1)} /s`} formula="successful collisions" />
          <Readout label="Activation energy" value={cat === 'on' ? 'Low' : 'High'} formula={cat === 'on' ? 'catalyst lowers Ea' : 'Ea'} />
        </>
      }
      note="Rate rises with temperature (faster, harder collisions), concentration (more collisions) and a catalyst (lower activation energy) — collision theory."
    />
  )
}
