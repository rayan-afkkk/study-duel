import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

export default function Circuit() {
  const [V, setV] = useState(6)
  const [R, setR] = useState(12)
  const I = V / R
  const P = V * I
  const phase = useRef(0)

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const x0 = w * 0.15
      const x1 = w * 0.85
      const y0 = h * 0.2
      const y1 = h * 0.8
      const perim = 2 * (x1 - x0) + 2 * (y1 - y0)
      phase.current = (phase.current + I * 120 * dt) % 40
      // wires
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 4
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
      ctx.globalAlpha = 1
      // battery (left side)
      const by = (y0 + y1) / 2
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor
      ctx.fillRect(x0 - 20, by - 26, 40, 52)
      ctx.strokeStyle = fg
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x0 - 18, by - 8)
      ctx.lineTo(x0 + 18, by - 8)
      ctx.stroke()
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(x0 - 9, by + 8)
      ctx.lineTo(x0 + 9, by + 8)
      ctx.stroke()
      ctx.fillStyle = fg
      ctx.font = '600 14px DM Sans, sans-serif'
      ctx.fillText(`${V} V`, x0 - 60, by + 5)
      // resistor (top)
      const rx = (x0 + x1) / 2
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor
      ctx.fillRect(rx - 50, y0 - 14, 100, 28)
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i <= 8; i++) ctx.lineTo(rx - 48 + i * 12, y0 + (i % 2 ? -12 : 12) * (i === 0 || i === 8 ? 0 : 1))
      ctx.stroke()
      ctx.fillStyle = fg
      ctx.fillText(`${R} Ω`, rx - 14, y0 - 22)
      // bulb (right)
      const glow = Math.min(1, P / 12)
      const g = ctx.createRadialGradient(x1, by, 4, x1, by, 30 + glow * 70)
      g.addColorStop(0, `rgba(255, 214, 102, ${0.25 + glow * 0.75})`)
      g.addColorStop(1, 'rgba(255, 214, 102, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x1, by, 30 + glow * 70, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(255, 220, 120, ${0.3 + glow * 0.7})`
      ctx.strokeStyle = fg
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x1, by, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // electrons moving around the loop
      ctx.fillStyle = C.blue
      for (let d = phase.current; d < perim; d += 40) {
        let px: number, py: number
        const top = x1 - x0
        const right = y1 - y0
        if (d < top) [px, py] = [x0 + d, y0]
        else if (d < top + right) [px, py] = [x1, y0 + (d - top)]
        else if (d < 2 * top + right) [px, py] = [x1 - (d - top - right), y1]
        else [px, py] = [x0, y1 - (d - 2 * top - right)]
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = fg
      ctx.fillText(`I = ${I.toFixed(2)} A`, rx - 30, y1 + 30)
    },
    [V, R],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Battery voltage (V)" value={V} unit="V" min={1} max={12} step={0.5} onChange={setV} />
          <Param label="Resistance (R)" value={R} unit="Ω" min={1} max={60} step={1} onChange={setR} />
        </>
      }
      readouts={
        <>
          <Readout label="Current" value={`${I.toFixed(2)} A`} formula="I = V / R" />
          <Readout label="Power" value={`${P.toFixed(1)} W`} formula="P = V × I" />
        </>
      }
      note="Double the voltage and watch the electrons speed up (current doubles). Increase resistance and the bulb dims — that's Ohm's law."
    />
  )
}
