import { useRef, useState } from 'react'
import { C, Param, Readout, SimShell, spawn, useCanvasLoop, type Particle } from './SimShell'

/** Ideal gas in a cylinder: PV = nRT. Temperature → particle speed, volume → piston position. */
export default function GasLaws() {
  const [T, setT] = useState(300)
  const [V, setV] = useState(6)
  const [n, setN] = useState(40)
  const parts = useRef<Particle[]>([])
  const hits = useRef({ count: 0, flash: 0 })
  const moles = n / 40 // 40 particles shown ≈ 1 mol
  const P = (moles * 8.314 * T) / (V / 1000) / 1000 // kPa (V in litres)

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const pad = 30
      const boxH = h - pad * 2
      const maxW = w - pad * 2 - 40
      const boxW = (maxW * V) / 10
      const speed = Math.sqrt(T) * 9
      if (parts.current.length !== n) parts.current = spawn(n, boxW, boxH, speed)
      // cylinder
      ctx.strokeStyle = fg
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.5
      ctx.strokeRect(pad, pad, maxW + 20, boxH)
      ctx.globalAlpha = 1
      // piston
      ctx.fillStyle = C.gold
      ctx.fillRect(pad + boxW, pad, 12, boxH)
      ctx.fillRect(pad + boxW + 12, pad + boxH / 2 - 5, maxW - boxW + 20, 10)
      // heat glow at the bottom
      ctx.fillStyle = `rgba(238,106,79,${Math.min(0.5, (T - 100) / 1000)})`
      ctx.fillRect(pad, pad + boxH - 8, boxW, 8)
      for (const p of parts.current) {
        const sp = Math.hypot(p.vx, p.vy) || 1
        p.vx = (p.vx / sp) * speed
        p.vy = (p.vy / sp) * speed
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < 5) {
          p.x = 5
          p.vx *= -1
        }
        if (p.x > boxW - 5) {
          p.x = boxW - 5
          p.vx *= -1
          hits.current.count++
        }
        if (p.y < 5 || p.y > boxH - 5) {
          p.y = Math.min(boxH - 5, Math.max(5, p.y))
          p.vy *= -1
        }
        ctx.fillStyle = C.blue
        ctx.beginPath()
        ctx.arc(pad + p.x, pad + p.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText('piston', pad + boxW - 10, pad - 8)
    },
    [T, V, n],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Temperature (T)" value={T} unit="K" min={100} max={800} step={10} onChange={setT} />
          <Param label="Volume (V)" value={V} unit="L" min={1} max={10} step={0.5} onChange={setV} />
          <Param label="Amount of gas" value={n} unit="particles" min={10} max={80} step={5} onChange={setN} />
        </>
      }
      readouts={
        <>
          <Readout label="Pressure" value={`${P.toFixed(0)} kPa`} formula="P = nRT / V" />
          <Readout label="P × V" value={`${(P * V).toFixed(0)}`} formula="constant if T fixed (Boyle)" />
          <Readout label="V / T" value={(V / T).toFixed(4)} formula="constant if P fixed (Charles)" />
          <Readout label="Moles" value={moles.toFixed(2)} formula="n" />
        </>
      }
      note="Halve the volume — the particles hit the piston twice as often, so pressure doubles (Boyle's law). Heat the gas — particles move faster and push harder."
    />
  )
}
