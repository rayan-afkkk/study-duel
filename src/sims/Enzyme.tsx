import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Enzyme activity vs temperature and pH (lock-and-key, denaturation). */
export default function Enzyme() {
  const [temp, setTemp] = useState(37)
  const [pH, setPH] = useState(7)
  const [optPH, setOptPH] = useState(7)
  const subs = useRef<{ x: number; y: number; state: 'free' | 'bound' | 'product'; t: number }[]>([])
  const denatured = temp > 55
  const tAct = denatured ? Math.max(0, 1 - (temp - 55) / 8) * 0.3 : Math.exp(-((temp - 37) ** 2) / 250)
  const pAct = Math.exp(-((pH - optPH) ** 2) / 3)
  const activity = Math.max(0, tAct * pAct)

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      const ex = w * 0.42
      const ey = h * 0.5
      if (subs.current.length < 10) subs.current.push({ x: w + 10, y: 40 + Math.random() * (h - 80), state: 'free', t: 0 })
      // enzyme (pac-man shape with active site); distorted when denatured
      const open = 0.35 + Math.sin(t * 6) * 0.08 * activity
      ctx.fillStyle = C.purple
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      for (let a = open; a <= Math.PI * 2 - open; a += 0.05) {
        const wob = denatured ? Math.sin(a * 7 + t * 3) * 12 : 0
        ctx.lineTo(ex + Math.cos(a) * (60 + wob), ey + Math.sin(a) * (60 + wob))
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText(denatured ? 'DENATURED' : 'enzyme', ex - 30, ey + 80)
      for (const s of subs.current) {
        if (s.state === 'free') {
          s.x -= (60 + 90 * activity) * dt
          s.y += (ey - s.y) * dt * 0.8
          if (Math.hypot(s.x - (ex + 45), s.y - ey) < 16 && Math.random() < activity + 0.02 && !denatured) {
            s.state = 'bound'
            s.t = 0
          } else if (s.x < -20) {
            s.x = w + 10
            s.y = 40 + Math.random() * (h - 80)
          }
        } else if (s.state === 'bound') {
          s.x = ex + 38
          s.y = ey
          s.t += dt * (0.5 + activity * 3)
          if (s.t > 1) {
            s.state = 'product'
            s.t = 0
          }
        } else {
          s.x -= 80 * dt
          s.y += (s.y < ey ? -1 : 1) * 40 * dt
          s.t += dt
          if (s.t > 3) {
            s.state = 'free'
            s.x = w + 10
            s.y = 40 + Math.random() * (h - 80)
          }
        }
        if (s.state === 'product') {
          ctx.fillStyle = C.gold
          ctx.beginPath()
          ctx.arc(s.x, s.y - 8, 7, 0, Math.PI * 2)
          ctx.arc(s.x, s.y + 8, 7, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = C.coral
          ctx.beginPath()
          ctx.moveTo(s.x - 12, s.y - 12)
          ctx.lineTo(s.x + 12, s.y)
          ctx.lineTo(s.x - 12, s.y + 12)
          ctx.closePath()
          ctx.fill()
        }
      }
      // activity bar
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.15
      ctx.fillRect(w - 50, 30, 18, h - 60)
      ctx.globalAlpha = 1
      ctx.fillStyle = C.green
      ctx.fillRect(w - 50, 30 + (h - 60) * (1 - activity), 18, (h - 60) * activity)
      ctx.fillStyle = fg
      ctx.fillText('rate', w - 56, 22)
    },
    [temp, pH, optPH, activity, denatured],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Temperature" value={temp} unit="°C" min={0} max={70} step={1} onChange={setTemp} />
          <Param label="pH" value={pH} unit="" min={1} max={14} step={0.5} onChange={setPH} />
          <Param label="Enzyme's optimum pH" value={optPH} unit="" min={2} max={10} step={1} onChange={setOptPH} />
        </>
      }
      readouts={
        <>
          <Readout label="Enzyme activity" value={`${Math.round(activity * 100)}%`} formula="best at optimum T & pH" />
          <Readout label="Active site" value={denatured ? 'Changed shape' : 'Fits substrate'} formula="lock-and-key model" />
        </>
      }
      note="Human enzymes work best at 37 °C. Pepsin (stomach) prefers pH 2; try setting the optimum pH to 2. Above ~55 °C the active site changes shape — denatured enzymes don't recover."
    />
  )
}
