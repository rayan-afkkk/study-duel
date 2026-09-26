import { Suspense, useEffect, useMemo, useState } from 'react'
import { FlaskConical, RefreshCw, Shapes } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { P } from '@/lib/params'
import { useSettings } from '@/lib/settings'
import { SIMS, relatedSims } from '@/sims'
import { getDocContext } from '@/lib/db'
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
  const [chapterText, setChapterText] = useState('')
  useEffect(() => {
    getDocContext(doc.id).then(setChapterText)
  }, [doc.id])
  // Only animations that actually belong to this chapter: the AI's pick + strong keyword matches (max 3).
  const list = useMemo(() => {
    const out = matched ? [matched] : []
    for (const x of relatedSims(chapterText)) if (!out.includes(x)) out.push(x)
    return out.slice(0, 3)
  }, [matched, chapterText])
  const [active, setActive] = useState<string | undefined>()
  const shownId = active ?? list[0]?.id
  const sim = list.find((x) => x.id === shownId)

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

          {list.length > 0 && (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Shapes className="h-4 w-4 text-muted-foreground" />
                <p className="section-label mr-2">Animated experiment for this chapter</p>
                {list.length > 1 &&
                  list.map((x) => (
                    <button
                      key={x.id}
                      data-sim={x.id}
                      onClick={() => setActive(x.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                        shownId === x.id ? 'border-coral bg-coral-soft text-coral' : 'bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <FlaskConical className="h-3.5 w-3.5" /> {x.name}
                    </button>
                  ))}
              </div>
              {sim && (
                <div>
                  <h3 className="text-3xl">{sim.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{sim.desc}</p>
                  <Suspense fallback={<Skeleton className="h-[440px] w-full" />}>
                    <sim.Component key={sim.id} />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AsyncState>
  )
}
