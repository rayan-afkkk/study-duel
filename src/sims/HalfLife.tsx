import { useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Radioactive decay: random nuclei decay; after each half-life, half remain. */
export default function HalfLife() {
  const [half, setHalf] = useState(4)
  const N0 = 400
  const st = useRef({ t: 0, alive: Array(N0).fill(true) as boolean[], hist: [] as number[] })
  const [left, setLeft] = useState(N0)
  const reset = () => {
    st.current = { t: 0, alive: Array(N0).fill(true), hist: [] }
    setLeft(N0)
  }

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const S = st.current
      S.t += dt
      const p = 1 - Math.pow(0.5, dt / half)
      let count = 0
      for (let i = 0; i < N0; i++) {
        if (S.alive[i] && Math.random() < p) S.alive[i] = false
        if (S.alive[i]) count++
      }
      if (Math.floor(S.t * 10) !== Math.floor((S.t - dt) * 10)) {
        S.hist.push(count)
        setLeft(count)
      }
      // grid of nuclei
      const cols = 20
      const cell = Math.min((w * 0.45) / cols, (h - 40) / 20)
      for (let i = 0; i < N0; i++) {
        const x = 20 + (i % cols) * cell
        const y = 20 + Math.floor(i / cols) * cell
        ctx.fillStyle = S.alive[i] ? C.coral : 'rgba(150,150,150,0.25)'
        ctx.beginPath()
        ctx.arc(x + cell / 2, y + cell / 2, cell / 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      // decay curve
      const gx = w * 0.55
      const gw = w * 0.42
      const gy = 20
      const gh = h - 60
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.3
      ctx.strokeRect(gx, gy, gw, gh)
      for (let k = 1; k <= 5; k++) {
        const x = gx + ((k * half * 10) / 300) * gw
        if (x < gx + gw) {
          ctx.beginPath()
          ctx.moveTo(x, gy)
          ctx.lineTo(x, gy + gh)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 3
      ctx.beginPath()
      S.hist.slice(0, 300).forEach((n, i) => {
        const x = gx + (i / 300) * gw
        const y = gy + gh * (1 - n / N0)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.stroke()
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('nuclei left', gx + 6, gy + 14)
      ctx.fillText('dashed lines = each half-life', gx + 6, gy + gh + 18)
    },
    [half],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Half-life" value={half} unit="s" min={1} max={10} step={1} onChange={(v) => { setHalf(v); reset() }} />
          <Button variant="secondary" className="w-full" onClick={reset}>
            <RotateCcw /> Restart
          </Button>
        </>
      }
      readouts={
        <>
          <Readout label="Undecayed nuclei" value={`${left} / ${N0}`} formula="N = N₀ × (½)^(t / T½)" />
          <Readout label="Half-lives passed" value={(st.current.t / half).toFixed(1)} formula="t / T½" />
        </>
      }
      note="Each nucleus decays at random, yet after every half-life almost exactly half remain. That's why carbon-14 can date ancient bones."
    />
  )
}
