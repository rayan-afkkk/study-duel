import { useState } from 'react'
import { C, Param, Readout, SimShell, arrow, useCanvasLoop } from './SimShell'

/** Convex lens ray diagram: 1/f = 1/u + 1/v (real-is-positive), image nature and magnification. */
export default function Lens() {
  const [f, setF] = useState(10)
  const [u, setU] = useState(25)
  const v = u === f ? Infinity : (u * f) / (u - f)
  const m = Number.isFinite(v) ? -v / u : Infinity
  const real = Number.isFinite(v) && v > 0
  const nature = !Number.isFinite(v) ? 'At infinity' : real ? `Real, inverted, ${Math.abs(m) > 1 ? 'magnified' : Math.abs(m) < 1 ? 'diminished' : 'same size'}` : 'Virtual, upright, magnified'

  const ref = useCanvasLoop(
    (ctx, w, h, _dt, _t, fg) => {
      const cx = w / 2
      const cy = h / 2
      const scale = Math.min(w / 110, 9)
      const X = (d: number) => cx + d * scale
      const objH = 40
      // axis
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()
      ctx.globalAlpha = 1
      // lens
      ctx.strokeStyle = C.blue
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(cx, cy, 10, h * 0.38, 0, 0, Math.PI * 2)
      ctx.stroke()
      // focal points
      ctx.fillStyle = C.gold
      for (const s of [-1, 1, -2, 2]) {
        ctx.beginPath()
        ctx.arc(X(s * f), cy, Math.abs(s) === 1 ? 5 : 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('F', X(f) - 4, cy + 20)
      ctx.fillText('F', X(-f) - 4, cy + 20)
      ctx.fillText('2F', X(2 * f) - 8, cy + 20)
      ctx.fillText('2F', X(-2 * f) - 8, cy + 20)
      // object
      const ox = X(-u)
      arrow(ctx, ox, cy, ox, cy - objH, C.green, 'object')
      // rays
      ctx.lineWidth = 2
      ctx.strokeStyle = C.coral
      ctx.globalAlpha = 0.9
      // ray 1: parallel then through F on the far side
      ctx.beginPath()
      ctx.moveTo(ox, cy - objH)
      ctx.lineTo(cx, cy - objH)
      const slope1 = objH / (f * scale)
      ctx.lineTo(w, cy - objH + slope1 * (w - cx))
      ctx.stroke()
      // ray 2: through optical centre
      ctx.beginPath()
      ctx.moveTo(ox, cy - objH)
      const slope2 = objH / (u * scale)
      ctx.lineTo(w, cy - objH + slope2 * (w - ox))
      ctx.stroke()
      ctx.globalAlpha = 1
      if (Number.isFinite(v) && Math.abs(v) < 400) {
        // image: x at v (right of lens if real, left if virtual); height m × object (negative = inverted)
        const ix = X(v)
        const iy = cy - m * objH
        if (!real) {
          // virtual image: the rays only APPEAR to come from here — dashed back-extensions
          ctx.setLineDash([6, 6])
          ctx.strokeStyle = C.coral
          ctx.globalAlpha = 0.6
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(cx, cy - objH)
          ctx.lineTo(ix, iy)
          ctx.moveTo(cx, cy)
          ctx.lineTo(ix, iy)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
        }
        arrow(ctx, ix, cy, ix, iy, C.purple, 'image')
      }
    },
    [f, u],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Object distance (u)" value={u} unit="cm" min={3} max={45} step={1} onChange={setU} />
          <Param label="Focal length (f)" value={f} unit="cm" min={5} max={20} step={1} onChange={setF} />
        </>
      }
      readouts={
        <>
          <Readout label="Image distance (v)" value={Number.isFinite(v) ? `${v.toFixed(1)} cm` : '∞'} formula="1/f = 1/u + 1/v" />
          <Readout label="Magnification" value={Number.isFinite(m) ? `${Math.abs(m).toFixed(2)}×` : '∞'} formula="m = v / u" />
          <Readout label="Image" value={nature} formula={real ? 'other side of lens' : 'same side as object'} />
        </>
      }
      note="Move the object closer than F — the image becomes virtual and magnified: that's how a magnifying glass works. Beyond 2F you get a small, real image, like a camera."
    />
  )
}
