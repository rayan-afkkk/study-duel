import { useState } from 'react'
import { FileDown, Printer, RefreshCw, ScrollText } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { useAiTask } from '@/hooks/useAiTask'
import { useSettings } from '@/lib/settings'
import { P } from '@/lib/params'
import { AsyncState, GenerateCTA } from '@/components/AsyncState'
import { PageBadge } from '@/components/DocViewer'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Param } from '@/sims/SimShell'
import { cn, letter } from '@/lib/utils'

const BOARDS = ['Sindh Board', 'Federal Board', 'O-Levels', 'Custom'] as const

export function GuessPaperTab({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const [board, setBoard] = useState<(typeof BOARDS)[number]>('Sindh Board')
  const [custom, setCustom] = useState({ mcqCount: 10, shortCount: 6, longCount: 3 })
  const params = P.guessPaper(s, board, custom)
  const ai = useAiTask('guessPaper', doc.id, params, { extra: params })
  const urdu = s.language === 'ur'

  return (
    <div className="space-y-6">
      <div className="no-print surface space-y-5 p-5">
        <div>
          <p className="section-label mb-3">Board pattern</p>
          <Segmented size="sm" value={board} onChange={setBoard} options={BOARDS.map((b) => ({ value: b, label: b }))} />
        </div>
        {board === 'Custom' && (
          <div className="grid gap-5 md:grid-cols-3">
            <Param label="MCQs" value={custom.mcqCount} unit="" min={0} max={30} step={1} onChange={(v) => setCustom({ ...custom, mcqCount: v })} />
            <Param label="Short questions" value={custom.shortCount} unit="" min={0} max={15} step={1} onChange={(v) => setCustom({ ...custom, shortCount: v })} />
            <Param label="Long questions" value={custom.longCount} unit="" min={0} max={8} step={1} onChange={(v) => setCustom({ ...custom, longCount: v })} />
          </div>
        )}
        {ai.status === 'success' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="coral" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <FileDown /> Save as PDF
            </Button>
            <Button variant="ghost" onClick={() => ai.regenerate()}>
              <RefreshCw /> New paper
            </Button>
          </div>
        )}
      </div>

      <AsyncState
        status={ai.status}
        error={ai.error}
        onRetry={() => ai.run()}
        messages={['Consulting past papers…', 'Setting marks like a board examiner…', 'Formatting the paper…']}
        idle={<GenerateCTA icon={<ScrollText />} title={`${board} guess paper`} desc="MCQs, short and long questions with marks, in the exact board pattern." onGenerate={() => ai.run()} />}
      >
        {ai.data && (
          <div className="print-area rounded-3xl border bg-card p-6 md:p-12">
            <div className="border-b pb-6 text-center">
              <p className="section-label">{ai.data.board}</p>
              <h2 className={cn('mt-2 text-4xl md:text-5xl', urdu && 'urdu')}>{ai.data.title}</h2>
              <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
                <span>Time: {Math.floor(ai.data.timeMinutes / 60) ? `${Math.floor(ai.data.timeMinutes / 60)}h ` : ''}{ai.data.timeMinutes % 60 ? `${ai.data.timeMinutes % 60}m` : ''}</span>
                <span>Total marks: {ai.data.totalMarks}</span>
              </div>
            </div>
            {ai.data.instructions.length > 0 && (
              <ul className="mt-6 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {ai.data.instructions.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            )}
            {ai.data.sections.map((sec, si) => (
              <section key={si} className="mt-10">
                <div className="flex items-baseline justify-between border-b pb-2">
                  <h3 className="text-3xl">{sec.name}</h3>
                  <span className="text-sm text-muted-foreground">{sec.questions.reduce((n, q) => n + q.marks, 0)} marks</span>
                </div>
                {sec.instructions && <p className="mt-2 text-sm italic text-muted-foreground">{sec.instructions}</p>}
                <ol className="mt-4 space-y-5">
                  {sec.questions.map((q, qi) => (
                    <li key={qi} className="flex gap-3">
                      <span className="w-7 shrink-0 font-semibold text-coral">{qi + 1}.</span>
                      <div className="flex-1">
                        <p className={cn('whitespace-pre-line leading-relaxed', urdu && 'urdu')}>{q.question}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                            {q.options.map((o, oi) => (
                              <span key={oi}>
                                ({letter(oi).toLowerCase()}) {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">[{q.marks}]</span>
                        <span className="no-print">
                          <PageBadge page={q.page} docId={doc.id} />
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  )
}
