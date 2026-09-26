import { useRef } from 'react'
import { C, useCanvasLoop } from '@/sims/SimShell'

/** Generic animated scene for AI-designed labs — its intensity follows one computed output (0..1). */
export function LabVisual({ type, level, label, value }: { type: string; level: number; label: string; value: string }) {
  const st = useRef<{ bubbles: { x: number; y: number; r: number }[]; parts: { x: number; y: number; vx: number; vy: number }[]; acc: number }>({
    bubbles: [],
    parts: [],
    acc: 0,
  })
  const L = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0))

  const ref = useCanvasLoop(
    (ctx, w, h, dt, t, fg) => {
      const S = st.current
      const cx = w / 2
      if (type === 'bubbles') {
        ctx.fillStyle = 'rgba(111,168,220,0.18)'
        ctx.fillRect(cx - 90, 30, 180, h - 50)
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.5
        ctx.strokeRect(cx - 90, 20, 180, h - 40)
        ctx.globalAlpha = 1
        S.acc += L * dt * 25
        while (S.acc > 1) {
          S.acc--
          S.bubbles.push({ x: cx + (Math.random() - 0.5) * 120, y: h - 30, r: 2 + Math.random() * 5 })
        }
        S.bubbles = S.bubbles.filter((b) => (b.y -= (50 + b.r * 10) * dt) > 34)
        ctx.strokeStyle = '#dff3ff'
        for (const b of S.bubbles) {
          ctx.beginPath()
          ctx.arc(b.x + Math.sin(b.y / 10) * 3, b.y, b.r, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (type === 'particles') {
        if (!S.parts.length)
          S.parts = Array.from({ length: 36 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: Math.random() - 0.5, vy: Math.random() - 0.5 }))
        const speed = 20 + L * 320
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.4
        ctx.strokeRect(10, 10, w - 20, h - 20)
        ctx.globalAlpha = 1
        for (const p of S.parts) {
          const sp = Math.hypot(p.vx, p.vy) || 1
          p.x += (p.vx / sp) * speed * dt
          p.y += (p.vy / sp) * speed * dt
          if (p.x < 16 || p.x > w - 16) p.vx *= -1
          if (p.y < 16 || p.y > h - 16) p.vy *= -1
          p.x = Math.min(w - 16, Math.max(16, p.x))
          p.y = Math.min(h - 16, Math.max(16, p.y))
          ctx.fillStyle = L > 0.66 ? C.coral : L > 0.33 ? C.gold : C.blue
          ctx.beginPath()
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (type === 'fill') {
        const bw = 160
        const top = 24
        const bh = h - 48
        ctx.strokeStyle = fg
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.6
        ctx.strokeRect(cx - bw / 2, top, bw, bh)
        ctx.globalAlpha = 1
        const lvl = bh * L
        ctx.fillStyle = C.blue
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.moveTo(cx - bw / 2, top + bh)
        for (let x = 0; x <= bw; x += 6) ctx.lineTo(cx - bw / 2 + x, top + bh - lvl + Math.sin(x / 14 + t * 3) * 3)
        ctx.lineTo(cx + bw / 2, top + bh)
        ctx.fill()
        ctx.globalAlpha = 1
      } else if (type === 'growth') {
        const ground = h - 24
        ctx.fillStyle = 'rgba(160,110,60,0.5)'
        ctx.fillRect(0, ground, w, 24)
        const stemH = 20 + L * (h - 70)
        ctx.strokeStyle = C.green
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(cx, ground)
        ctx.quadraticCurveTo(cx + Math.sin(t) * 8, ground - stemH / 2, cx, ground - stemH)
        ctx.stroke()
        const leaves = Math.round(1 + L * 7)
        ctx.fillStyle = C.green
        for (let i = 1; i <= leaves; i++) {
          const y = ground - (stemH * i) / (leaves + 1)
          const side = i % 2 ? 1 : -1
          ctx.beginPath()
          ctx.ellipse(cx + side * 18, y, 18, 7, side * -0.5, 0, Math.PI * 2)
          ctx.fill()
        }
        if (L > 0.7) {
          ctx.fillStyle = C.gold
          ctx.beginPath()
          ctx.arc(cx, ground - stemH - 8, 12, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (type === 'thermometer') {
        const tx = cx - 12
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.15
        ctx.fillRect(tx, 24, 24, h - 90)
        ctx.globalAlpha = 1
        ctx.fillStyle = C.coral
        ctx.fillRect(tx + 4, 24 + (h - 90) * (1 - L), 16, (h - 90) * L + 10)
        ctx.beginPath()
        ctx.arc(cx, h - 50, 24, 0, Math.PI * 2)
        ctx.fill()
        if (L > 0.6)
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = `rgba(238,106,79,${0.5 - i * 0.12})`
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(cx + 50 + i * 16, h - 60)
            for (let y = h - 60; y > 60; y -= 8) ctx.lineTo(cx + 50 + i * 16 + Math.sin(y / 12 + t * 4) * 5, y)
            ctx.stroke()
          }
      } else {
        // meter / gauge
        const r = Math.min(w / 2 - 20, h - 50)
        const cy = h - 24
        ctx.lineWidth = 16
        ctx.strokeStyle = 'rgba(150,150,150,0.25)'
        ctx.beginPath()
        ctx.arc(cx, cy, r, Math.PI, 0)
        ctx.stroke()
        ctx.strokeStyle = C.coral
        ctx.beginPath()
        ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * L)
        ctx.stroke()
        const a = Math.PI + Math.PI * L + Math.sin(t * 8) * 0.01
        ctx.strokeStyle = fg
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20))
        ctx.stroke()
      }
      ctx.fillStyle = fg
      ctx.font = '600 13px DM Sans, sans-serif'
      ctx.fillText(`${label}: ${value}`, 14, 18)
    },
    [type, L, label, value],
  )
  return <canvas ref={ref} className="h-full w-full text-foreground" />
}
