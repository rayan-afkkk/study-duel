import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Inline } from '@/components/RichText'
import { ReadAloudBar } from '@/components/ReadAloudBar'
import { useReadAloud } from '@/hooks/useReadAloud'
import { splitSentences } from '@/lib/speech'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SummaryTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const { status, data, error, run, regenerate } = useAiTask('summary', doc.id, P.summary(s), { auto: true })
  const urdu = s.language === 'ur'
  const overview = useMemo(() => (data ? splitSentences(data.overview) : []), [data])
  const sentences = useMemo(() => [...overview, ...(data?.keyPoints.map((k) => k.point) ?? [])], [overview, data])
  const reader = useReadAloud(sentences, s.language)

  return (
    <AsyncState status={status} error={error} onRetry={() => run()}>
      {data && (
        <div className="space-y-6">
          <ReadAloudBar ctrl={reader} total={sentences.length} label="Listen to the summary" />
          <div className="surface p-6 md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className={cn('text-4xl md:text-5xl', urdu && 'urdu')}>{data.title}</h2>
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <RefreshCw /> Regenerate
              </Button>
            </div>
            <p className={cn('mt-5 text-lg leading-8 text-foreground/90', urdu && 'urdu')}>
              {overview.map((t, i) => (
                <span key={i} className={cn(reader.index === i && 'reading-active')}>
                  <Inline text={t} />{' '}
                </span>
              ))}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="surface p-6">
              <p className="section-label mb-4">Key points</p>
              <ol className="space-y-3">
                {data.keyPoints.map((k, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn('flex items-start gap-3 rounded-2xl p-3 transition', reader.index === overview.length + i && 'bg-gold-soft')}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-soft text-xs font-bold text-coral">{i + 1}</span>
                    <span className={cn('flex-1 text-[15px] leading-relaxed', urdu && 'urdu')}>
                      <Inline text={k.point} />
                    </span>
                    <PageBadge page={k.page} docId={doc.id} />
                  </motion.li>
                ))}
              </ol>
            </div>
            <div className="surface p-6">
              <p className="section-label mb-4">Key terms</p>
              <div className="space-y-3">
                {data.keyTerms.map((t, i) => (
                  <div key={i} className="rounded-2xl bg-secondary/60 p-4">
                    <p className={cn('font-bold text-coral', urdu && 'urdu')}>{t.term}</p>
                    <p className={cn('mt-1 text-sm text-muted-foreground', urdu && 'urdu')}>{t.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AsyncState>
  )
}
