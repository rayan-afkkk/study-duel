import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpenText, Lightbulb, MessageCircleQuestion, RefreshCw } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Mermaid } from '@/components/Mermaid'
import { AiChart } from '@/components/AiChart'
import { Inline } from '@/components/RichText'
import { ReadAloudBar } from '@/components/ReadAloudBar'
import { useReadAloud } from '@/hooks/useReadAloud'
import { splitSentences } from '@/lib/speech'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '')

export function ExplanationTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const [params, setParams] = useSearchParams()
  const { status, data, error, run, regenerate } = useAiTask('explain', doc.id, P.explain(s), { auto: true })
  const urdu = s.language === 'ur'

  // Flatten into sentences so read-aloud can highlight the one being spoken.
  const structure = useMemo(() => {
    let idx = 0
    const sentences: string[] = []
    const topics = (data?.topics ?? []).map((t) => {
      sentences.push(t.title + '.')
      const titleIdx = idx++
      const paragraphs = t.content.split(/\n{2,}/).map((p) =>
        splitSentences(p).map((text) => {
          sentences.push(text)
          return { text, idx: idx++ }
        }),
      )
      return { topic: t, titleIdx, paragraphs }
    })
    return { sentences, topics }
  }, [data])

  const reader = useReadAloud(structure.sentences, s.language)

  useEffect(() => {
    const topic = params.get('topic')
    if (topic && data) {
      setTimeout(() => document.getElementById(`topic-${topic}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    }
  }, [params, data])

  useEffect(() => {
    if (reader.index < 0) return
    document.querySelector(`[data-s="${reader.index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [reader.index])

  return (
    <AsyncState status={status} error={error} onRetry={() => run()}>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-1">
            <p className="section-label mb-3">Topics</p>
            {structure.topics.map(({ topic }, i) => (
              <a
                key={i}
                href={`#topic-${slug(topic.title)}`}
                className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <span className="mr-2 text-xs text-coral">{String(i + 1).padStart(2, '0')}</span>
                {topic.title}
              </a>
            ))}
            <Button variant="ghost" size="sm" className="mt-4" onClick={regenerate}>
              <RefreshCw /> Regenerate
            </Button>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <ReadAloudBar ctrl={reader} total={structure.sentences.length} label="Read the explanation aloud" className="z-20 md:sticky md:top-[136px] lg:top-[84px]" />
          {structure.topics.map(({ topic: t, titleIdx, paragraphs }, i) => (
            <motion.article
              key={i}
              id={`topic-${slug(t.title)}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              className="surface scroll-mt-28 p-6 md:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-2xl text-coral">{String(i + 1).padStart(2, '0')}</span>
                  <h2 data-s={titleIdx} className={cn('text-3xl md:text-4xl', reader.index === titleIdx && 'reading-active', urdu && 'urdu')}>
                    {t.title}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.pages.map((p) => (
                    <PageBadge key={p} page={p} docId={doc.id} />
                  ))}
                </div>
              </div>

              <div className={cn('prose-study mt-5', urdu && 'urdu')}>
                {paragraphs.map((sents, pi) => (
                  <p key={pi}>
                    {sents.map(({ text, idx }) => (
                      <span
                        key={idx}
                        data-s={idx}
                        onClick={() => reader.play(idx)}
                        className={cn('cursor-pointer transition-colors duration-200', reader.index === idx && 'reading-active')}
                      >
                        <Inline text={text} />{' '}
                      </span>
                    ))}
                  </p>
                ))}
              </div>

              <div className="mt-2 grid gap-4 md:grid-cols-2">
                {t.keyPoints.length > 0 && (
                  <div className="rounded-2xl bg-secondary/60 p-5">
                    <p className="section-label mb-3 flex items-center gap-2">
                      <BookOpenText className="h-3.5 w-3.5" /> Key points
                    </p>
                    <ul className={cn('space-y-2 text-sm', urdu && 'urdu')}>
                      {t.keyPoints.map((k, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                          <span>
                            <Inline text={k} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.example && (
                  <div className="rounded-2xl bg-gold-soft p-5">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                      <Lightbulb className="h-3.5 w-3.5" /> Real-life example
                    </p>
                    <p className={cn('text-sm leading-relaxed', urdu && 'urdu')}>
                      <Inline text={t.example} />
                    </p>
                  </div>
                )}
              </div>

              {(t.diagram || t.chart?.data?.length) && (
                <div className="mt-5 grid gap-4">
                  {t.diagram && <Mermaid chart={t.diagram} className="rounded-2xl border bg-background/50 p-4" />}
                  {t.chart && t.chart.data?.length > 0 && <AiChart chart={t.chart} />}
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParams({ tab: 'arena', mode: 'explain', topic: t.title })}
                >
                  <MessageCircleQuestion /> Explain it back
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </AsyncState>
  )
}
