import { useEffect, useId, useRef, useState } from 'react'
import { useSettings } from '@/lib/settings'
import { Skeleton } from './ui/skeleton'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null
const loadMermaid = () => (mermaidPromise ??= import('mermaid').then((m) => m.default))

/** Renders a Mermaid diagram; silently hides itself if the AI produced invalid syntax. */
export function Mermaid({ chart, className }: { chart: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const { theme } = useSettings()

  useEffect(() => {
    let cancelled = false
    const dark = document.documentElement.classList.contains('dark')
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'DM Sans, sans-serif',
          themeVariables: dark
            ? {
                background: '#000000',
                primaryColor: '#1f3a52',
                primaryTextColor: '#f4ede1',
                primaryBorderColor: '#3b5b78',
                lineColor: '#ee6a4f',
                secondaryColor: '#3e2426',
                tertiaryColor: '#1c1a17',
                fontSize: '15px',
              }
            : {
                primaryColor: '#d6e4f0',
                primaryTextColor: '#1a1714',
                primaryBorderColor: '#9fb8cf',
                lineColor: '#d9543a',
                secondaryColor: '#f3dedc',
                tertiaryColor: '#fffcf7',
                fontSize: '15px',
              },
        })
        const cleaned = chart.replace(/^```(?:mermaid)?/i, '').replace(/```$/, '').trim()
        const { svg } = await mermaid.render(`m${id}${Date.now()}`, cleaned)
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setState('ok')
        }
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [chart, id, theme])

  if (state === 'error') return null
  return (
    <div className={className}>
      {state === 'loading' && <Skeleton className="h-48 w-full" />}
      <div ref={ref} className="mermaid-wrap flex justify-center overflow-x-auto" />
    </div>
  )
}
