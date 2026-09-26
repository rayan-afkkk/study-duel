import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Double circulation: heart → lungs → heart → body. Exercise raises heart rate and blood flow. */
export default function Heart() {
  const [effort, setEffort] = useState(20)
  const bpm = Math.round(70 + effort * 1.1)
  const stroke = 70 + effort * 0.4 // mL
  const output = (bpm * stroke) / 1000 // L/min
  const cells = useRef(Array.from({ length: 36 }, (_, i) => i / 36))

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      const cx = w / 2
      const cy = h / 2
      const beat = Math.max(0, Math.sin(t * Math.PI * 2 * (bpm / 60))) ** 6
      // loop path: heart centre, lungs top, body bottom
      const pt = (u: number) => {
        // figure-8: first half via lungs (top), second half via body (bottom)
        const a = u * Math.PI * 4
        const r = u < 0.5 ? h * 0.3 : h * 0.34
        const dir = u < 0.5 ? -1 : 1
        return { x: cx + Math.sin(a) * w * 0.3, y: cy + dir * Math.abs(Math.sin(a / 2)) * r * 1.4 }
      }
      ctx.lineWidth = 16
      ctx.globalAlpha = 0.15
      ctx.strokeStyle = fg
      ctx.beginPath()
      for (let u = 0; u <= 1.001; u += 0.01) {
        const p = pt(u)
        u ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      // lungs & body
      ctx.fillStyle = 'rgba(244,143,177,0.35)'
      ctx.beginPath()
      ctx.ellipse(cx - 40, 40, 40, 26, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 40, 40, 40, 26, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('LUNGS (gets O₂)', cx - 48, 16)
      ctx.fillText('BODY (uses O₂)', cx - 44, h - 10)
      // blood cells
      const speed = 0.05 + (bpm / 60) * 0.06
      cells.current = cells.current.map((u) => (u + speed * dt * (1 + beat)) % 1)
      for (const u of cells.current) {
        const p = pt(u)
        const oxy = u > 0.2 && u < 0.75 // oxygenated after lungs until body
        ctx.fillStyle = oxy ? '#e53935' : '#5c6bc0'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      // heart
      const s = 1 + beat * 0.12
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(s, s)
      ctx.fillStyle = C.coral
      ctx.beginPath()
      ctx.moveTo(0, 22)
      ctx.bezierCurveTo(-40, -6, -22, -34, 0, -16)
      ctx.bezierCurveTo(22, -34, 40, -6, 0, 22)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = fg
      ctx.fillText(`${bpm} bpm`, cx + 36, cy + 4)
    },
    [bpm],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={<Param label="Exercise level" value={effort} unit="%" min={0} max={100} step={1} onChange={setEffort} />}
      readouts={
        <>
          <Readout label="Heart rate" value={`${bpm} bpm`} formula="beats per minute" />
          <Readout label="Cardiac output" value={`${output.toFixed(1)} L/min`} formula="heart rate × stroke volume" />
        </>
      }
      note="Red = oxygenated blood (from lungs to body), blue = deoxygenated (body back to lungs). Blood passes through the heart twice per circuit — double circulation."
    />
  )
}
