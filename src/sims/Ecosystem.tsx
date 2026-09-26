import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { C, Param, Readout, SimShell, useCanvasLoop } from './SimShell'

/** Predator–prey (Lotka–Volterra): rabbits and foxes rise and fall in cycles. */
export default function Ecosystem() {
  const [birth, setBirth] = useState(1.0)
  const [hunt, setHunt] = useState(0.02)
  const [death, setDeath] = useState(0.8)
  const pop = useRef({ prey: 40, pred: 9, hist: [] as { prey: number; pred: number }[] })
  const [now, setNow] = useState({ prey: 40, pred: 9 })

  const reset = () => {
    pop.current = { prey: 40, pred: 9, hist: [] }
  }
  useEffect(() => {
    reset()
  }, [birth, hunt, death])

  const ref = useCanvasLoop(
    (ctx, w, h, dt, _t, fg) => {
      const P = pop.current
      for (let i = 0; i < 10; i++) {
        const d = (dt * 1.5) / 10
        const dPrey = birth * P.prey - hunt * P.prey * P.pred
        const dPred = 0.01 * P.prey * P.pred - death * P.pred
        P.prey = Math.max(0.5, P.prey + dPrey * d)
        P.pred = Math.max(0.5, P.pred + dPred * d)
      }
      P.hist.push({ prey: P.prey, pred: P.pred })
      if (P.hist.length > 600) P.hist.shift()
      if (Math.random() < 0.1) setNow({ prey: P.prey, pred: P.pred })
      const max = Math.max(120, ...P.hist.map((x) => Math.max(x.prey, x.pred)))
      const gx = 40
      const gw = w - 60
      const gy = 20
      const gh = h * 0.55
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.25
      ctx.strokeRect(gx, gy, gw, gh)
      ctx.globalAlpha = 1
      for (const [key, color] of [['prey', C.green], ['pred', C.coral]] as const) {
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        P.hist.forEach((p, i) => {
          const x = gx + (i / 600) * gw
          const y = gy + gh * (1 - p[key] / max)
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        })
        ctx.stroke()
      }
      ctx.fillStyle = fg
      ctx.font = '600 12px DM Sans, sans-serif'
      ctx.fillText('population', 4, gy + 10)
      ctx.fillText('time →', gx + gw - 44, gy + gh + 16)
      // field with animals
      const fy = gy + gh + 30
      ctx.fillStyle = 'rgba(111,207,151,0.12)'
      ctx.fillRect(gx, fy, gw, h - fy - 10)
      const rabbits = Math.min(80, Math.round(P.prey / 2))
      const foxes = Math.min(30, Math.round(P.pred / 2))
      ctx.font = '16px sans-serif'
      for (let i = 0; i < rabbits; i++) ctx.fillText('🐇', gx + ((i * 53) % (gw - 20)), fy + 18 + ((i * 29) % Math.max(20, h - fy - 40)))
      for (let i = 0; i < foxes; i++) ctx.fillText('🦊', gx + ((i * 97 + 31) % (gw - 20)), fy + 18 + ((i * 41 + 13) % Math.max(20, h - fy - 40)))
    },
    [birth, hunt, death],
  )

  return (
    <SimShell
      canvas={<canvas ref={ref} className="h-full w-full" />}
      controls={
        <>
          <Param label="Rabbit birth rate" value={birth} unit="" min={0.2} max={2} step={0.1} onChange={setBirth} />
          <Param label="Hunting success" value={hunt} unit="" min={0.005} max={0.05} step={0.005} onChange={setHunt} />
          <Param label="Fox death rate" value={death} unit="" min={0.2} max={1.5} step={0.1} onChange={setDeath} />
          <Button variant="secondary" className="w-full" onClick={reset}>
            <RotateCcw /> Restart
          </Button>
        </>
      }
      readouts={
        <>
          <Readout label="Rabbits (prey)" value={String(Math.round(now.prey))} formula="green line" />
          <Readout label="Foxes (predators)" value={String(Math.round(now.pred))} formula="coral line" />
        </>
      }
      note="More rabbits → more food → more foxes → fewer rabbits → foxes starve → rabbits recover. The predator peak always comes after the prey peak."
    />
  )
}
