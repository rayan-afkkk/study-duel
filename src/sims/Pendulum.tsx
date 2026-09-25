import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

export default function Pendulum() {
  const [L, setL] = useState(1.2)
  const [g, setG] = useState(9.8)
  const [amp, setAmp] = useState(25)
  const st = useRef({ theta: (25 * Math.PI) / 180, omega: 0, trail: [] as { x: number; y: number }[] })
  const T = 2 * Math.PI * Math.sqrt(L / g)

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const s = st.current
      // semi-implicit Euler with sub-steps (accurate enough for a classroom demo)
      const steps = 8
      for (let i = 0; i < steps; i++) {
        s.omega += (-(g / L) * Math.sin(s.theta) * dt) / steps
        s.theta += (s.omega * dt) / steps
      }
      const scale = (h - 80) / 2.6
      const ox = w / 2
      const oy = 30
      const x = ox + Math.sin(s.theta) * L * scale
      const y = oy + Math.cos(s.theta) * L * scale
      s.trail.push({ x, y })
      if (s.trail.length > 50) s.trail.shift()

      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.25
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox, oy + L * scale + 20)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.fillRect(ox - 60, oy - 8, 120, 8)
      s.trail.forEach((p, i) => {
        ctx.globalAlpha = (i / s.trail.length) * 0.5
        ctx.fillStyle = C.gold
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      ctx.strokeStyle = fg
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(x, y)
      ctx.stroke()
      const grad = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 22)
      grad.addColorStop(0, '#ffb09e')
      grad.addColorStop(1, C.coral)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`θ = ${((s.theta * 180) / Math.PI).toFixed(1)}°`, 16, h - 16)
    },
    [L, g],
  )

  const reset = (a: number) => {
    st.current = { theta: (a * Math.PI) / 180, omega: 0, trail: [] }
  }

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Length (L)" value={L} unit="m" min={0.2} max={2.5} step={0.1} onChange={(v) => { setL(v); reset(amp) }} />
          <Param label="Gravity (g)" value={g} unit="m/s²" min={1.6} max={25} step={0.1} onChange={(v) => { setG(v); reset(amp) }} />
          <Param label="Release angle" value={amp} unit="°" min={5} max={70} step={1} onChange={(v) => { setAmp(v); reset(v) }} />
        </>
      }
      readouts={
        <>
          <Readout label="Time period" value={`${T.toFixed(2)} s`} formula="T = 2π√(L/g)" />
          <Readout label="Frequency" value={`${(1 / T).toFixed(2)} Hz`} formula="f = 1/T" />
        </>
      }
      note="Try Moon gravity (1.6) — the pendulum swings much slower. Notice the period does NOT depend on the mass or (for small angles) the release angle."
    />
  )
}
