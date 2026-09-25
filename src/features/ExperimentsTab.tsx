import { Suspense, useEffect, useState } from 'react'
import { FlaskConical, Sparkles } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { getDocContext } from '@/lib/db'
import { generate, getCached } from '@/lib/aiClient'
import { P } from '@/lib/params'
import { useSettings } from '@/lib/settings'
import { SIMS, pickByKeywords } from '@/sims'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ExperimentsTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const [active, setActive] = useState<string>()
  const [reason, setReason] = useState<string>()
  const [picking, setPicking] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const context = await getDocContext(doc.id)
      const explain = await getCached('explain', doc.id, P.explain(s))
      const topics = explain?.topics.map((t) => t.title) ?? context.split('\n').filter((l) => l.length > 3 && l.length < 60).slice(0, 20)
      try {
        const pick = await generate('pickSimulation', {
          docId: doc.id,
          params: P.pickSimulation(),
          context: false,
          extra: { topics, simulations: SIMS.map((x) => ({ id: x.id, name: x.name, covers: x.desc })) },
        })
        const found = SIMS.find((x) => x.id === pick.simulationId) ?? pickByKeywords(context)
        if (!cancelled) {
          setActive(found.id)
          setReason(pick.reason)
        }
      } catch {
        // offline fallback: keyword matching on the chapter text
        const found = pickByKeywords(context)
        if (!cancelled) {
          setActive(found.id)
          setReason('Matched to your chapter by keywords.')
        }
      } finally {
        if (!cancelled) setPicking(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  const sim = SIMS.find((x) => x.id === active)

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SIMS.map((x) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              active === x.id ? 'border-coral bg-coral-soft text-coral' : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <FlaskConical className="h-4 w-4" /> {x.name}
          </button>
        ))}
      </div>
      {picking ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-gold" /> AI is choosing the best experiment for this chapter…
          </p>
          <Skeleton className="h-[440px] w-full" />
        </div>
      ) : (
        sim && (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-4xl">{sim.name}</h2>
                <p className="text-sm text-muted-foreground">{sim.desc}</p>
              </div>
              {reason && (
                <span className="chip-gold max-w-full">
                  <Sparkles className="h-3 w-3 shrink-0" /> <span className="truncate">{reason}</span>
                </span>
              )}
            </div>
            <Suspense fallback={<Skeleton className="h-[440px] w-full" />}>
              <sim.Component key={sim.id} />
            </Suspense>
          </div>
        )
      )}
    </div>
  )
}
