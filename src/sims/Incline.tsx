import { useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { C, Param, Readout, SimShell, arrow, useCanvasLoop } from './SimShell'

const G = 9.8

export default function Incline() {
  const [theta, setTheta] = useState(30)
  const [m, setM] = useState(5)
  const [mu, setMu] = useState(0.3)
  const st = useRef({ s: 0, v: 0 })
  const th = (theta * Math.PI) / 180
  const Fpar = m * G * Math.sin(th)
  const N = m * G * Math.cos(th)
  const fMax = mu * N
  const moving = Fpar > fMax
  const a = moving ? G * (Math.sin(th) - mu * Math.cos(th)) : 0

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const s = st.current
      const len = Math.min(w * 0.8, (h - 60) / Math.max(Math.sin(th), 0.1)) // slope length in px
      const bx = w * 0.1
      const by = h - 30
      const topX = bx + len * Math.cos(th)
      const topY = by - len * Math.sin(th)
      // ramp
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.12
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(topX, by)
      ctx.lineTo(topX, topY)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = fg
      ctx.lineWidth = 2
      ctx.stroke()
      // motion (px per metre = 40)
      if (moving) {
        s.v += a * dt
        s.s += s.v * dt * 40
      }
      const maxS = len - 60
      if (s.s > maxS) {
        s.s = 0
        s.v = 0
      }
      const d = 30 + s.s // distance from top along slope
      const cx = topX - Math.cos(th) * d
      const cy = topY + Math.sin(th) * d
      const size = 22 + m * 1.6
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-th)
      ctx.fillStyle = C.coral
      ctx.fillRect(-size / 2, -size, size, size)
      ctx.fillStyle = '#fff'
      ctx.font = '700 12px DM Sans, sans-serif'
      ctx.fillText(`${m}kg`, -size / 2 + 4, -size / 2 + 4)
      ctx.restore()
      // force arrows from box centre
      const ox = cx - Math.sin(th) * (size / 2)
      const oy = cy - Math.cos(th) * (size / 2)
      const k = 2.2
      arrow(ctx, ox, oy, ox, oy + m * G * k, C.blue, 'mg')
      arrow(ctx, ox, oy, ox - Math.sin(th) * N * k, oy - Math.cos(th) * N * k, C.green, 'N')
      arrow(ctx, ox, oy, ox - Math.cos(th) * Fpar * k, oy + Math.sin(th) * Fpar * k, C.gold, 'mg sinθ')
      const f = Math.min(fMax, Fpar)
      arrow(ctx, ox, oy, ox + Math.cos(th) * f * k, oy - Math.sin(th) * f * k, C.purple, 'f')
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`θ = ${theta}°`, topX - 70, by - 10)
    },
    [theta, m, mu],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Angle (θ)" value={theta} unit="°" min={0} max={60} step={1} onChange={(v) => { setTheta(v); st.current = { s: 0, v: 0 } }} />
          <Param label="Mass (m)" value={m} unit="kg" min={1} max={20} step={1} onChange={setM} />
          <Param label="Friction coefficient (μ)" value={mu} unit="" min={0} max={1} step={0.05} onChange={(v) => { setMu(v); st.current = { s: 0, v: 0 } }} />
          <Button variant="secondary" className="w-full" onClick={() => (st.current = { s: 0, v: 0 })}>
            <RotateCcw /> Reset block
          </Button>
        </>
      }
      readouts={
        <>
          <Readout label="Down-slope force" value={`${Fpar.toFixed(1)} N`} formula="mg sinθ" />
          <Readout label="Max friction" value={`${fMax.toFixed(1)} N`} formula="μ mg cosθ" />
          <Readout label="Net force" value={`${moving ? (Fpar - fMax).toFixed(1) : '0.0'} N`} formula="F = ma" />
          <Readout label="Acceleration" value={`${a.toFixed(2)} m/s²`} formula="g(sinθ − μcosθ)" />
        </>
      }
      note={moving ? 'The block slides: the down-slope force beats limiting friction. Notice acceleration does not depend on mass!' : 'Static friction holds the block. Increase the angle or reduce μ until it starts to slide.'}
    />
  )
}
