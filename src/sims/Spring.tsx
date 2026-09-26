import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Hooke's law F = kx and the mass–spring oscillator T = 2π√(m/k). */
export default function Spring() {
  const [k, setK] = useState(40)
  const [m, setM] = useState(1)
  const st = useRef({ y: 0, v: 0 })
  const ext = (m * 9.8) / k // metres
  const limit = 0.5
  const T = 2 * Math.PI * Math.sqrt(m / k)

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const s = st.current
      const acc = (-k * s.y) / m - 0.3 * s.v
      s.v += acc * dt
      s.y += s.v * dt
      const px = 200 // px per metre
      const cx = w / 2
      const top = 30
      const rest = 90
      const len = rest + (ext + s.y) * px
      // support
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.5
      ctx.fillRect(cx - 80, top - 10, 160, 10)
      ctx.globalAlpha = 1
      // spring coils
      ctx.strokeStyle = ext > limit ? C.coral : C.blue
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, top)
      const coils = 14
      for (let i = 1; i <= coils; i++) ctx.lineTo(cx + (i % 2 ? 18 : -18), top + (len * i) / (coils + 1))
      ctx.lineTo(cx, top + len)
      ctx.stroke()
      // mass
      const size = 30 + m * 8
      ctx.fillStyle = C.gold
      ctx.fillRect(cx - size / 2, top + len, size, size)
      ctx.fillStyle = '#000'
      ctx.font = '700 12px DM Sans, sans-serif'
      ctx.fillText(`${m} kg`, cx - 16, top + len + size / 2 + 4)
      // ruler
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      for (let cm = 0; cm <= 150; cm += 10) {
        const y = top + rest + (cm / 100) * px
        ctx.moveTo(cx + 110, y)
        ctx.lineTo(cx + (cm % 50 ? 118 : 126), y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('extension', cx + 130, top + rest - 6)
      if (ext > limit) ctx.fillText('⚠ past elastic limit!', cx - 60, h - 16)
    },
    [k, m],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Mass (m)" value={m} unit="kg" min={0.2} max={5} step={0.1} onChange={(v) => { setM(v); st.current = { y: 0.08, v: 0 } }} />
          <Param label="Spring constant (k)" value={k} unit="N/m" min={10} max={200} step={5} onChange={(v) => { setK(v); st.current = { y: 0.08, v: 0 } }} />
        </>
      }
      readouts={
        <>
          <Readout label="Force (weight)" value={`${(m * 9.8).toFixed(1)} N`} formula="F = mg" />
          <Readout label="Extension" value={`${(ext * 100).toFixed(1)} cm`} formula="x = F / k" />
          <Readout label="Time period" value={`${T.toFixed(2)} s`} formula="T = 2π√(m/k)" />
          <Readout label="Stiffness" value={k > 100 ? 'Stiff' : k > 40 ? 'Medium' : 'Soft'} formula="k" />
        </>
      }
      note="Double the mass — the extension doubles (Hooke's law), as long as you stay below the elastic limit."
    />
  )
}
