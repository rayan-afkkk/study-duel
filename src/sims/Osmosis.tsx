import { useState } from 'react'
import { C, Param, Readout, SimShell, Toggle, useCanvasLoop } from './SimShell'

/** A cell placed in solutions of different concentration: water moves by osmosis. */
export default function Osmosis() {
  const [outside, setOutside] = useState(0.9)
  const [cell, setCell] = useState('plant')
  const inside = 0.9
  const diff = inside - outside // + → water moves in
  const scale = Math.max(0.55, Math.min(cell === 'animal' ? 1.45 : 1.12, 1 + diff * 0.25))
  const burst = cell === 'animal' && diff > 0.6
  const state =
    Math.abs(diff) < 0.1
      ? 'Isotonic — no net movement'
      : diff > 0
        ? cell === 'plant'
          ? 'Turgid — cell wall stops it bursting'
          : burst
            ? 'Bursts (lysis)'
            : 'Swells'
        : cell === 'plant'
          ? 'Plasmolysed — membrane pulls away'
          : 'Shrivels (crenation)'

  const ref = useCanvasLoop(
    (ctx, w, h, _dt, t, fg) => {
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.28
      // solution shading
      ctx.fillStyle = `rgba(111,168,220,${0.08 + outside / 8})`
      ctx.fillRect(0, 0, w, h)
      // solute dots outside
      ctx.fillStyle = C.gold
      const dots = Math.round(outside * 30)
      for (let i = 0; i < dots; i++) {
        const a = i * 2.39 + t * 0.2
        const r = R * 1.5 + ((i * 37) % 60)
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      if (cell === 'plant') {
        // rigid cell wall
        ctx.strokeStyle = C.green
        ctx.lineWidth = 8
        ctx.strokeRect(cx - R * 1.1, cy - R * 0.8, R * 2.2, R * 1.6)
        // membrane / cytoplasm
        const s = Math.min(1, scale)
        ctx.fillStyle = 'rgba(111,207,151,0.35)'
        ctx.strokeStyle = C.green
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(cx - R * 1.05 * s, cy - R * 0.75 * s, R * 2.1 * s, R * 1.5 * s, 18)
        ctx.fill()
        ctx.stroke()
        // vacuole
        ctx.fillStyle = 'rgba(111,168,220,0.55)'
        ctx.beginPath()
        ctx.ellipse(cx, cy, R * 0.7 * s, R * 0.45 * s, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (!burst) {
        ctx.fillStyle = 'rgba(238,106,79,0.35)'
        ctx.strokeStyle = C.coral
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
          const wobble = scale < 0.9 ? Math.sin(a * 9) * 6 : 0
          const r = R * scale + wobble
          const x = cx + Math.cos(a) * r
          const y = cy + Math.sin(a) * r * 0.8
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.strokeStyle = C.coral
        ctx.lineWidth = 3
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R, 18, a, a + 1.2)
          ctx.stroke()
        }
      }
      // water arrows
      if (Math.abs(diff) >= 0.1) {
        ctx.strokeStyle = C.blue
        ctx.fillStyle = C.blue
        ctx.lineWidth = 3
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const phase = (t * 0.8 + i * 0.13) % 1
          const r1 = R * (diff > 0 ? 1.9 - phase * 0.6 : 1.1 + phase * 0.6)
          const x = cx + Math.cos(a) * r1
          const y = cy + Math.sin(a) * r1 * 0.75
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`outside: ${outside.toFixed(1)}% salt · inside: ${inside}%`, 16, h - 16)
    },
    [outside, cell, scale, burst, diff],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Toggle label="Cell type" value={cell} onChange={setCell} options={[{ value: 'plant', label: 'Plant cell' }, { value: 'animal', label: 'Red blood cell' }]} />
          <Param label="Salt concentration outside" value={outside} unit="%" min={0} max={3} step={0.1} onChange={setOutside} />
        </>
      }
      readouts={
        <>
          <Readout label="Solution is" value={Math.abs(diff) < 0.1 ? 'Isotonic' : diff > 0 ? 'Hypotonic' : 'Hypertonic'} formula="compared to cell sap" />
          <Readout label="What happens" value={state} formula={diff > 0 ? 'water moves IN' : diff < 0 ? 'water moves OUT' : 'balanced'} />
        </>
      }
      note="Osmosis: water moves from a dilute solution to a concentrated one through a partially permeable membrane. Plant cells have a wall, so they become turgid instead of bursting."
    />
  )
}
