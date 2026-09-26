import { Suspense, useState } from 'react'
import { FlaskConical, RefreshCw, Shapes } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { P } from '@/lib/params'
import { useSettings } from '@/lib/settings'
import { SIMS } from '@/sims'
import { AsyncState } from '@/components/AsyncState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CustomLab } from './CustomLab'
import { cn } from '@/lib/utils'

/**
 * Every chapter gets its OWN virtual experiment, designed by the AI from the chapter's content
 * (sliders + live results + graph + guided steps), or a hands-on activity for non-science chapters.
 * The built-in animations are shown underneath when one genuinely matches.
 */
export function ExperimentsTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const ai = useAiTask('experiment', doc.id, P.experiment(s), {
    auto: true,
    extra: { simulations: SIMS.map((x) => ({ id: x.id, covers: x.desc })) },
  })
  const matched = SIMS.find((x) => x.id === ai.data?.simulationId)
  const [active, setActive] = useState<string | undefined>()
  const shownId = active ?? matched?.id
  const sim = SIMS.find((x) => x.id === shownId)

  return (
    <AsyncState status={ai.status} error={ai.error} onRetry={() => ai.run()} messages={['Designing an experiment for this chapter…', 'Setting up the lab bench…', 'Calibrating the sliders…']}>
      {ai.data && (
        <div className="space-y-8">
          <div>
            <CustomLab key={JSON.stringify(ai.data).length} exp={ai.data} />
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => ai.regenerate()}>
                <RefreshCw /> Design a different experiment
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Shapes className="h-4 w-4 text-muted-foreground" />
              <p className="section-label">{matched ? 'Animated simulation for this topic' : 'More animated simulations'}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {SIMS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setActive(shownId === x.id ? '' : x.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                    shownId === x.id ? 'border-coral bg-coral-soft text-coral' : 'bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FlaskConical className="h-4 w-4" /> {x.name}
                  {matched?.id === x.id && <span className="text-[10px] uppercase tracking-wider text-gold">match</span>}
                </button>
              ))}
            </div>
            {sim && (
              <div className="mt-4">
                <p className="mb-3 text-sm text-muted-foreground">{sim.desc}</p>
                <Suspense fallback={<Skeleton className="h-[440px] w-full" />}>
                  <sim.Component key={sim.id} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      )}
    </AsyncState>
  )
}
