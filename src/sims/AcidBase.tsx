import { useMemo, useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Strong acid (25 mL HCl) titrated with NaOH; universal-indicator colour + pH meter + titration curve. */
const ACID_ML = 25

function pHof(acidM: number, baseM: number, baseML: number) {
  const molH = (acidM * ACID_ML) / 1000
  const molOH = (baseM * baseML) / 1000
  const vol = (ACID_ML + baseML) / 1000
  const diff = molH - molOH
  if (Math.abs(diff) < 1e-9) return 7
  return diff > 0 ? -Math.log10(diff / vol) : 14 + Math.log10(-diff / vol)
}

function indicator(pH: number) {
  // universal indicator: red → orange → yellow → green → blue → purple
  const stops = [
    [1, [220, 38, 38]],
    [3, [249, 115, 22]],
    [5, [234, 179, 8]],
    [7, [34, 197, 94]],
    [9, [59, 130, 246]],
    [11, [79, 70, 229]],
    [13, [126, 34, 206]],
  ] as const
  const x = Math.min(13, Math.max(1, pH))
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]
    const [b, cb] = stops[i + 1]
    if (x <= b) {
      const f = (x - a) / (b - a)
      return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(',')})`
    }
  }
  return 'rgb(126,34,206)'
}

export default function AcidBase() {
  const [acidM, setAcidM] = useState(0.1)
  const [baseM, setBaseM] = useState(0.1)
  const [added, setAdded] = useState(10)
  const pH = pHof(acidM, baseM, added)
  const endpoint = (acidM * ACID_ML) / baseM
  const curve = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ v: (i / 100) * 50, pH: pHof(acidM, baseM, (i / 100) * 50) })), [acidM, baseM])

  const ref = useCanvasLoop(
    (ctx, w, h, _dt, t, fg) => {
      // burette
      const bx = w * 0.22
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 2
      ctx.strokeRect(bx - 10, 20, 20, h * 0.4)
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(111,168,220,0.5)'
      const left = (50 - added) / 50
      ctx.fillRect(bx - 8, 20 + h * 0.4 * (1 - left), 16, h * 0.4 * left)
      // falling drop
      const dy = ((t * 120) % 60) + 20 + h * 0.4
      if (added < 50) {
        ctx.fillStyle = C.blue
        ctx.beginPath()
        ctx.arc(bx, dy, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      // flask
      const fy = h * 0.62
      ctx.beginPath()
      ctx.moveTo(bx - 14, fy)
      ctx.lineTo(bx - 14, fy + 25)
      ctx.lineTo(bx - 70, h - 30)
      ctx.lineTo(bx + 70, h - 30)
      ctx.lineTo(bx + 14, fy + 25)
      ctx.lineTo(bx + 14, fy)
      ctx.strokeStyle = fg
      ctx.lineWidth = 2
      ctx.stroke()
      const lvl = h - 30 - 30 - (added / 50) * 25
      ctx.save()
      ctx.clip()
      ctx.fillStyle = indicator(pH)
      ctx.fillRect(bx - 80, lvl, 160, h)
      ctx.restore()
      // titration curve
      const gx = w * 0.45
      const gw = w * 0.5
      const gy = 30
      const gh = h - 70
      ctx.globalAlpha = 0.3
      ctx.strokeRect(gx, gy, gw, gh)
      ctx.beginPath()
      ctx.moveTo(gx, gy + gh / 2)
      ctx.lineTo(gx + gw, gy + gh / 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.strokeStyle = C.coral
      ctx.lineWidth = 3
      ctx.beginPath()
      curve.forEach((p, i) => {
        const x = gx + (p.v / 50) * gw
        const y = gy + gh * (1 - p.pH / 14)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.stroke()
      ctx.fillStyle = C.gold
      ctx.beginPath()
      ctx.arc(gx + (added / 50) * gw, gy + gh * (1 - pH / 14), 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('pH', gx - 22, gy + 10)
      ctx.fillText('7', gx - 14, gy + gh / 2 + 4)
      ctx.fillText('NaOH added (mL) →', gx + gw - 120, gy + gh + 18)
    },
    [acidM, baseM, added, pH, curve],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="NaOH added" value={added} unit="mL" min={0} max={50} step={0.5} onChange={setAdded} />
          <Param label="HCl concentration" value={acidM} unit="mol/L" min={0.05} max={0.5} step={0.05} onChange={setAcidM} />
          <Param label="NaOH concentration" value={baseM} unit="mol/L" min={0.05} max={0.5} step={0.05} onChange={setBaseM} />
        </>
      }
      readouts={
        <>
          <Readout label="pH" value={pH.toFixed(2)} formula={pH < 6.5 ? 'acidic' : pH > 7.5 ? 'basic (alkaline)' : 'neutral'} />
          <Readout label="End point" value={endpoint <= 50 ? `${endpoint.toFixed(1)} mL` : '> 50 mL'} formula="mol H⁺ = mol OH⁻" />
        </>
      }
      note="HCl + NaOH → NaCl + H₂O. Watch the indicator turn green exactly at the end point, where the curve shoots up — neutralisation."
    />
  )
}
