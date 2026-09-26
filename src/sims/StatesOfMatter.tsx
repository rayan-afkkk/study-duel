import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Water particles as a solid lattice, a liquid, or a gas depending on temperature. */
export default function StatesOfMatter() {
  const [T, setT] = useState(20)
  const st = useRef<{ x: number; y: number; vx: number; vy: number; hx: number; hy: number }[]>([])
  const state = T < 0 ? 'Solid (ice)' : T < 100 ? 'Liquid (water)' : 'Gas (steam)'

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      const cols = 8
      const rows = 5
      const gap = 26
      const ox = w / 2 - (cols * gap) / 2
      const oy = h - rows * gap - 30
      if (!st.current.length)
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) st.current.push({ x: ox + c * gap, y: oy + r * gap, vx: 0, vy: 0, hx: ox + c * gap, hy: oy + r * gap })
      // container
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 3
      ctx.strokeRect(20, 20, w - 40, h - 40)
      ctx.globalAlpha = 1
      const energy = Math.max(0, T + 50) / 200
      for (const p of st.current) {
        if (T < 0) {
          // vibrate around fixed lattice sites
          p.x += (p.hx - p.x) * 0.2 + (Math.random() - 0.5) * (1 + energy * 3)
          p.y += (p.hy - p.y) * 0.2 + (Math.random() - 0.5) * (1 + energy * 3)
        } else {
          const speed = T < 100 ? 40 + T * 1.5 : 200 + (T - 100) * 3
          p.vx += (Math.random() - 0.5) * speed * 0.3
          p.vy += (Math.random() - 0.5) * speed * 0.3 + (T < 100 ? 30 : 0) * dt * 10
          const sp = Math.hypot(p.vx, p.vy) || 1
          p.vx = (p.vx / sp) * speed
          p.vy = (p.vy / sp) * speed
          p.x += p.vx * dt
          p.y += p.vy * dt
          const top = T < 100 ? h - 30 - rows * gap * 1.3 : 30
          if (p.x < 30 || p.x > w - 30) p.vx *= -1
          if (p.y < top || p.y > h - 30) p.vy *= -1
          p.x = Math.min(w - 30, Math.max(30, p.x))
          p.y = Math.min(h - 30, Math.max(top, p.y))
        }
      }
      // bonds for solid
      if (T < 0) {
        ctx.strokeStyle = C.blue
        ctx.globalAlpha = 0.35
        ctx.lineWidth = 2
        for (let i = 0; i < st.current.length; i++) {
          const a = st.current[i]
          if ((i + 1) % cols) {
            const b = st.current[i + 1]
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
          const d = st.current[i + cols]
          if (d) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(d.x, d.y)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
      }
      for (const p of st.current) {
        ctx.fillStyle = T < 0 ? '#9ED0FF' : T < 100 ? C.blue : C.coral
        ctx.beginPath()
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      // thermometer
      const tx = w - 60
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.15
      ctx.fillRect(tx, 40, 14, h - 110)
      ctx.globalAlpha = 1
      const frac = (T + 50) / 200
      ctx.fillStyle = C.coral
      ctx.fillRect(tx, 40 + (h - 110) * (1 - frac), 14, (h - 110) * frac)
      ctx.beginPath()
      ctx.arc(tx + 7, h - 60, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`${T} °C`, tx - 12, 32)
      void t
    },
    [T],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={<Param label="Temperature" value={T} unit="°C" min={-50} max={150} step={1} onChange={setT} />}
      readouts={
        <>
          <Readout label="State" value={state} formula={T < 0 ? 'fixed positions, vibrate' : T < 100 ? 'slide past each other' : 'far apart, fast'} />
          <Readout label="Particle energy" value={T < 0 ? 'Low' : T < 100 ? 'Medium' : 'High'} formula="KE ∝ temperature" />
        </>
      }
      note="Slowly heat ice past 0 °C (melting point) and 100 °C (boiling point). The particles never change — only how fast they move and how strongly they stay together."
    />
  )
}
