import { useState } from 'react'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

const ELEMENTS = [
  ['H', 'Hydrogen', 1], ['He', 'Helium', 4], ['Li', 'Lithium', 7], ['Be', 'Beryllium', 9], ['B', 'Boron', 11], ['C', 'Carbon', 12],
  ['N', 'Nitrogen', 14], ['O', 'Oxygen', 16], ['F', 'Fluorine', 19], ['Ne', 'Neon', 20], ['Na', 'Sodium', 23], ['Mg', 'Magnesium', 24],
  ['Al', 'Aluminium', 27], ['Si', 'Silicon', 28], ['P', 'Phosphorus', 31], ['S', 'Sulphur', 32], ['Cl', 'Chlorine', 35], ['Ar', 'Argon', 40],
  ['K', 'Potassium', 39], ['Ca', 'Calcium', 40],
] as const

function shells(z: number) {
  const caps = [2, 8, 8, 2]
  const out: number[] = []
  let left = z
  for (const c of caps) {
    if (left <= 0) break
    out.push(Math.min(c, left))
    left -= c
  }
  return out
}

/** Bohr model builder: protons, neutrons and electrons in shells (2, 8, 8, 2). */
export default function Atom() {
  const [z, setZ] = useState(11)
  const [sym, name, mass] = ELEMENTS[z - 1]
  const conf = shells(z)
  const valence = conf[conf.length - 1]
  const neutrons = mass - z

  const ref = useCanvasLoop(
    (ctx, w, h, _dt, t, fg) => {
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) / 2 - 20
      // nucleus
      const nucleons = Math.min(z + neutrons, 40)
      for (let i = 0; i < nucleons; i++) {
        const a = i * 2.4
        const r = Math.sqrt(i) * 4
        ctx.fillStyle = i % 2 === 0 && i / 2 < z ? C.coral : '#9aa0a6'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      conf.forEach((count, s) => {
        const r = (R * (s + 1)) / 4.3
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
        for (let e = 0; e < count; e++) {
          const a = (e / count) * Math.PI * 2 + t * (1.2 - s * 0.25)
          ctx.fillStyle = s === conf.length - 1 ? C.gold : C.blue
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.fillStyle = fg
      ctx.font = '400 42px Instrument Serif, serif'
      ctx.fillText(sym, 24, 56)
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`${name}`, 24, 78)
    },
    [z],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={<Param label="Atomic number (Z)" value={z} unit="" min={1} max={20} step={1} onChange={setZ} />}
      readouts={
        <>
          <Readout label="Electronic configuration" value={conf.join(', ')} formula="shells K, L, M, N" />
          <Readout label="Valence electrons" value={String(valence)} formula={`Group ${valence === 8 || (z === 2) ? '18 (noble gas)' : valence}`} />
          <Readout label="Protons / Neutrons" value={`${z} / ${neutrons}`} formula={`mass number ${mass}`} />
          <Readout label="Period" value={String(conf.length)} formula="number of shells" />
        </>
      }
      note="Gold electrons are valence electrons — they decide how the element reacts. Elements with a full outer shell (He, Ne, Ar) are unreactive noble gases."
    />
  )
}
