import { useRef, useState } from 'react'
import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { C, Param, Readout, SimShell, arrow, useCanvasLoop } from './SimShell'

export default function Projectile() {
  const [v, setV] = useState(22)
  const [angle, setAngle] = useState(45)
  const [g, setG] = useState(9.8)
  const st = useRef({ t: 0, flying: false, paths: [] as { x: number; y: number }[][] })
  const th = (angle * Math.PI) / 180
  const range = (v * v * Math.sin(2 * th)) / g
  const H = (v * v * Math.sin(th) ** 2) / (2 * g)
  const T = (2 * v * Math.sin(th)) / g

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const s = st.current
      const pad = 40
      // paths are stored in world metres, so earlier launches stay comparable at the current scale
      const scale = Math.min((w - pad * 2) / Math.max(range * 1.1, 60), (h - pad * 2) / Math.max(H * 1.2, 30))
      const gx = pad
      const gy = h - pad
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
      ctx.globalAlpha = 1
      // old paths
      s.paths.forEach((p, i) => {
        ctx.strokeStyle = i === s.paths.length - 1 ? C.coral : fg
        ctx.globalAlpha = i === s.paths.length - 1 ? 1 : 0.2
        ctx.lineWidth = 2
        ctx.beginPath()
        p.forEach((pt, j) => (j ? ctx.lineTo(gx + pt.x * scale, gy - pt.y * scale) : ctx.moveTo(gx + pt.x * scale, gy - pt.y * scale)))
        ctx.stroke()
      })
      ctx.globalAlpha = 1
      // cannon
      ctx.save()
      ctx.translate(gx, gy)
      ctx.rotate(-th)
      ctx.fillStyle = fg
      ctx.fillRect(0, -6, 34, 12)
      ctx.restore()
      if (!s.flying) arrow(ctx, gx, gy, gx + Math.cos(th) * 70, gy - Math.sin(th) * 70, C.gold, `${v} m/s`)
      if (s.flying) {
        s.t += dt * 1.2
        const x = v * Math.cos(th) * s.t
        const y = v * Math.sin(th) * s.t - 0.5 * g * s.t * s.t
        const path = s.paths[s.paths.length - 1]
        if (y < 0) {
          s.flying = false
          path.push({ x: range, y: 0 })
        } else {
          path.push({ x, y })
          ctx.fillStyle = C.coral
          ctx.beginPath()
          ctx.arc(gx + x * scale, gy - y * scale, 9, 0, Math.PI * 2)
          ctx.fill()
          arrow(ctx, gx + x * scale, gy - y * scale, gx + x * scale, gy - y * scale + 40, C.blue, 'mg')
        }
      }
    },
    [v, angle, g],
  )

  const launch = () => {
    const s = st.current
    s.t = 0
    s.flying = true
    s.paths = [...s.paths.slice(-4), [{ x: 0, y: 0 }]]
  }

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Launch speed (v)" value={v} unit="m/s" min={5} max={40} step={1} onChange={setV} />
          <Param label="Angle (θ)" value={angle} unit="°" min={10} max={80} step={1} onChange={setAngle} />
          <Param label="Gravity (g)" value={g} unit="m/s²" min={1.6} max={25} step={0.1} onChange={setG} />
          <Button variant="coral" className="w-full" onClick={launch}>
            <Rocket /> Launch
          </Button>
        </>
      }
      readouts={
        <>
          <Readout label="Range" value={`${range.toFixed(1)} m`} formula="R = v²·sin2θ / g" />
          <Readout label="Max height" value={`${H.toFixed(1)} m`} formula="H = v²·sin²θ / 2g" />
          <Readout label="Flight time" value={`${T.toFixed(2)} s`} formula="T = 2v·sinθ / g" />
          <Readout label="Best angle" value="45°" formula="for max range" />
        </>
      }
      note="Launch at 30° and then at 60° — they land at the same spot! Complementary angles give equal range."
    />
  )
}
