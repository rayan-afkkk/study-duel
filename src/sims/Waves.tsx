import { useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

export default function Waves() {
  const [A, setA] = useState(40)
  const [f, setF] = useState(1)
  const [lambda, setLambda] = useState(200)
  const v = (f * lambda) / 100 // px→ "cm" scale: 100 px = 1 m

  const ref = useCanvasLoop(
    (ctx, w, h, _dt, t, fg) => {
      const mid = h / 2
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()
      ctx.globalAlpha = 1
      const k = (2 * Math.PI) / lambda
      const wAng = 2 * Math.PI * f
      ctx.strokeStyle = C.coral
      ctx.lineWidth = 4
      ctx.beginPath()
      for (let x = 0; x <= w; x += 3) {
        const y = mid - A * Math.sin(k * x - wAng * t)
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.stroke()
      // particles bobbing (transverse)
      for (let x = 20; x < w; x += 40) {
        const y = mid - A * Math.sin(k * x - wAng * t)
        ctx.fillStyle = x === 20 + 40 * 4 ? C.gold : C.blue
        ctx.beginPath()
        ctx.arc(x, y, x === 20 + 40 * 4 ? 8 : 4, 0, Math.PI * 2)
        ctx.fill()
      }
      // wavelength marker
      ctx.strokeStyle = C.green
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(40, mid + A + 30)
      ctx.lineTo(40 + lambda, mid + A + 30)
      ctx.stroke()
      ctx.fillStyle = C.green
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText('λ', 40 + lambda / 2 - 4, mid + A + 50)
    },
    [A, f, lambda],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Amplitude" value={A} unit="px" min={5} max={120} step={1} onChange={setA} />
          <Param label="Frequency" value={f} unit="Hz" min={0.2} max={3} step={0.1} onChange={setF} />
          <Param label="Wavelength" value={lambda / 100} unit="m" min={0.6} max={4} step={0.1} onChange={(x) => setLambda(x * 100)} />
        </>
      }
      readouts={
        <>
          <Readout label="Wave speed" value={`${v.toFixed(2)} m/s`} formula="v = f λ" />
          <Readout label="Time period" value={`${(1 / f).toFixed(2)} s`} formula="T = 1/f" />
        </>
      }
      note="The golden particle only moves up and down — energy travels along the wave, not the particles (transverse wave)."
    />
  )
}
