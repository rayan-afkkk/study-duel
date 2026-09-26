import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Pondweed in water under a lamp: O₂ bubbles show the rate of photosynthesis (limiting factors). */
export default function Photosynthesis() {
  const [light, setLight] = useState(60)
  const [co2, setCo2] = useState(50)
  const [temp, setTemp] = useState(25)
  const bubbles = useRef<{ x: number; y: number; r: number }[]>([])
  const acc = useRef(0)
  const tempF = temp > 45 ? Math.max(0, 1 - (temp - 45) / 10) : Math.exp(-((temp - 30) ** 2) / 300)
  const rate = Math.min(light, co2) * tempF // bubbles per minute (relative)
  const limiting = tempF < 0.6 ? 'Temperature' : light < co2 ? 'Light intensity' : 'Carbon dioxide'

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      // lamp
      const lx = 70
      ctx.fillStyle = `rgba(255, 220, 120, ${0.15 + light / 150})`
      ctx.beginPath()
      ctx.moveTo(lx + 20, 60)
      ctx.lineTo(w * 0.62, h * 0.25)
      ctx.lineTo(w * 0.62, h * 0.85)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = C.gold
      ctx.beginPath()
      ctx.arc(lx, 60, 22, 0, Math.PI * 2)
      ctx.fill()
      // beaker
      const bx = w * 0.55
      const bw = w * 0.32
      const top = h * 0.2
      ctx.fillStyle = 'rgba(111,168,220,0.18)'
      ctx.fillRect(bx, top + 20, bw, h - top - 40)
      ctx.strokeStyle = fg
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.strokeRect(bx, top, bw, h - top - 20)
      ctx.globalAlpha = 1
      // pondweed
      const px = bx + bw / 2
      ctx.strokeStyle = C.green
      ctx.lineWidth = 4
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(px + i * 12, h - 22)
        for (let y = h - 22; y > top + 70; y -= 10) ctx.lineTo(px + i * 12 + Math.sin(y / 20 + t + i) * 6, y)
        ctx.stroke()
        for (let y = h - 40; y > top + 80; y -= 22) {
          ctx.fillStyle = C.green
          ctx.beginPath()
          ctx.ellipse(px + i * 12 + 9, y, 9, 4, -0.5, 0, Math.PI * 2)
          ctx.ellipse(px + i * 12 - 9, y - 8, 9, 4, 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // bubbles
      acc.current += (rate / 60) * dt * 12
      while (acc.current > 1) {
        acc.current -= 1
        bubbles.current.push({ x: px + (Math.random() - 0.5) * 30, y: top + 80, r: 3 + Math.random() * 3 })
      }
      bubbles.current = bubbles.current.filter((b) => (b.y -= 60 * dt) > top + 22)
      ctx.strokeStyle = '#dff3ff'
      ctx.lineWidth = 1.5
      for (const b of bubbles.current) {
        ctx.beginPath()
        ctx.arc(b.x + Math.sin(b.y / 8) * 2, b.y, b.r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('O₂ bubbles', px + 30, top + 40)
      ctx.fillText(`${temp} °C`, bx + bw - 44, h - 30)
    },
    [light, co2, temp, rate],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Light intensity" value={light} unit="%" min={0} max={100} step={1} onChange={setLight} />
          <Param label="CO₂ concentration" value={co2} unit="%" min={0} max={100} step={1} onChange={setCo2} />
          <Param label="Temperature" value={temp} unit="°C" min={0} max={60} step={1} onChange={setTemp} />
        </>
      }
      readouts={
        <>
          <Readout label="Rate (O₂ bubbles)" value={`${rate.toFixed(0)} /min`} formula="6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" />
          <Readout label="Limiting factor" value={limiting} formula="the factor in shortest supply" />
        </>
      }
      note="Increase light: the rate rises until CO₂ becomes the limiting factor. Above ~45 °C enzymes denature and photosynthesis stops."
    />
  )
}
