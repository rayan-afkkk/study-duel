import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, ImagePlus, PenLine, ThumbsUp, TrendingUp } from 'lucide-react'
import type { StudyDoc } from '@/lib/db'
import { getDocContext } from '@/lib/db'
import type { GradeData } from '@shared/schemas'
import { callAi } from '@/lib/aiClient'
import { useSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { ErrorCard, LoadingMessages } from '@/components/AsyncState'
import { awardXp } from '@/lib/progress'
import { imageToBase64 } from '@/lib/utils'

export function HandwritingGrade({ doc }: { doc: StudyDoc }) {
  const s = useSettings()
  const [file, setFile] = useState<File>()
  const [question, setQuestion] = useState('')
  const [maxMarks, setMaxMarks] = useState('5')
  const [board, setBoard] = useState('Matric board')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<GradeData>()
  const cam = useRef<HTMLInputElement>(null)
  const pick = useRef<HTMLInputElement>(null)

  const grade = async () => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      const img = await imageToBase64(file, 1800)
      const context = (await getDocContext(doc.id)).slice(0, 60_000)
      const res = await callAi('grade', { images: [{ mimeType: img.mimeType, data: img.data }], question, maxMarks: Number(maxMarks), board, language: s.language, context })
      setResult(res.data)
      await awardXp(15, 'Handwriting graded')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pct = result ? result.marks / Math.max(1, result.outOf) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface space-y-4 p-6">
        <div>
          <h3 className="text-3xl">Handwriting grading</h3>
          <p className="text-sm text-muted-foreground">Snap your handwritten answer — get board-style marks and examiner feedback.</p>
        </div>
        <Input placeholder="Question (optional — e.g. State Newton's third law with 2 examples)" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Segmented size="sm" value={maxMarks} onChange={setMaxMarks} options={['3', '5', '8', '10'].map((m) => ({ value: m, label: `${m} marks` }))} className="col-span-2" />
          <Segmented size="sm" value={board} onChange={setBoard} options={[{ value: 'Matric board', label: 'Matric' }, { value: 'O-Levels (Cambridge)', label: 'O-Levels' }]} className="col-span-2" />
        </div>
        {file ? (
          <div className="relative overflow-hidden rounded-2xl border">
            <img src={URL.createObjectURL(file)} alt="Your answer" className="max-h-80 w-full object-contain" />
            <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => setFile(undefined)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cam.current?.click()} className="dashed-card flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground hover:border-coral/50">
              <Camera className="h-7 w-7" /> Take photo
            </button>
            <button onClick={() => pick.current?.click()} className="dashed-card flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground hover:border-coral/50">
              <ImagePlus className="h-7 w-7" /> Upload image
            </button>
          </div>
        )}
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0])} />
        <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0])} />
        <Button variant="coral" size="lg" className="w-full" disabled={!file || busy} onClick={grade}>
          <PenLine /> Grade my answer
        </Button>
      </div>

      <div>
        {busy && (
          <div className="surface p-6">
            <LoadingMessages messages={['Deciphering your handwriting…', 'Checking against the marking scheme…', 'Putting on the examiner glasses…']} />
          </div>
        )}
        {error && <ErrorCard error={error} onRetry={grade} />}
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="surface p-6 text-center">
              <p className="section-label">Examiner’s marks</p>
              <p className="mt-2 font-serif text-8xl leading-none">
                <span className={pct >= 0.7 ? 'text-success' : pct >= 0.4 ? 'text-gold' : 'text-coral'}>{result.marks}</span>
                <span className="text-4xl text-muted-foreground">/{result.outOf}</span>
              </p>
              <p className="mt-4 text-left leading-relaxed">{result.feedback}</p>
            </div>
            {result.strengths.length > 0 && (
              <div className="surface p-5">
                <p className="mb-2 flex items-center gap-2 font-semibold"><ThumbsUp className="h-4 w-4 text-success" /> Strengths</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">{result.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {result.improvements.length > 0 && (
              <div className="surface p-5">
                <p className="mb-2 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-coral" /> To get full marks</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">{result.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {result.transcription && (
              <details className="surface p-5 text-sm">
                <summary className="cursor-pointer font-semibold">What the AI read</summary>
                <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{result.transcription}</p>
              </details>
            )}
          </motion.div>
        )}
        {!busy && !error && !result && (
          <div className="dashed-card flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Tip: write clearly on lined paper and photograph in good light.
          </div>
        )}
      </div>
    </div>
  )
}
