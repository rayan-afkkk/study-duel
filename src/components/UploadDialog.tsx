import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, FileText, ImagePlus, Type, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Segmented } from './ui/segmented'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Progress } from './ui/progress'
import { ingestImages, ingestPdf, ingestText } from '@/lib/ingest'
import { awardXp } from '@/lib/progress'
import { cn } from '@/lib/utils'

type Mode = 'pdf' | 'photo' | 'text'

export function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [mode, setMode] = useState<Mode>('pdf')
  const [busy, setBusy] = useState<{ label: string; pct: number } | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [drag, setDrag] = useState(false)
  const nav = useNavigate()
  const pdfInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  const done = async (id: string) => {
    await awardXp(5, 'Uploaded a chapter')
    toast.success('Chapter ready! +5 🪙')
    onOpenChange(false)
    setPhotos([])
    setText('')
    setTitle('')
    nav(`/doc/${id}`)
  }

  const run = async (fn: () => Promise<{ id: string }>) => {
    try {
      setBusy({ label: 'Starting…', pct: 0.02 })
      const d = await fn()
      await done(d.id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const onPdf = (f?: File) => {
    if (!f) return
    if (f.type === 'text/plain' || f.name.endsWith('.txt')) return run(async () => ingestText(f.name.replace(/\.txt$/, ''), await f.text()))
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return toast.error('Please choose a PDF or .txt file.')
    run(() => ingestPdf(f, (label, pct) => setBusy({ label, pct })))
  }

  const addPhotos = (list: FileList | null) => {
    if (!list) return
    setPhotos((p) => [...p, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 12))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a chapter</DialogTitle>
          <DialogDescription>PDFs, photos of book pages, or pasted notes — we’ll turn it into a full study kit.</DialogDescription>
        </DialogHeader>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'pdf', label: 'PDF / TXT', icon: <FileText /> },
            { value: 'photo', label: 'Photos', icon: <Camera /> },
            { value: 'text', label: 'Paste', icon: <Type /> },
          ]}
        />

        {busy ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{busy.label}</p>
            <Progress value={busy.pct * 100} indicatorClassName="bg-coral" />
          </div>
        ) : mode === 'pdf' ? (
          <button
            onClick={() => pdfInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              onPdf(e.dataTransfer.files[0])
            }}
            className={cn('dashed-card flex flex-col items-center gap-3 px-6 py-12 transition', drag && 'border-coral bg-coral-soft/40')}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-soft text-coral">
              <UploadCloud className="h-6 w-6" />
            </span>
            <span className="font-semibold">Drop a PDF here or click to browse</span>
            <span className="text-xs text-muted-foreground">Text is extracted in your browser with pdf.js — page numbers are kept for citations.</span>
            <input ref={pdfInput} type="file" accept="application/pdf,.pdf,text/plain,.txt" hidden onChange={(e) => onPdf(e.target.files?.[0])} />
          </button>
        ) : mode === 'photo' ? (
          <div className="space-y-4">
            <Input placeholder="Chapter title (e.g. Biology Ch 4 — Cells)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => cameraInput.current?.click()}>
                <Camera /> Take photo
              </Button>
              <Button variant="secondary" size="lg" onClick={() => photoInput.current?.click()}>
                <ImagePlus /> Choose photos
              </Button>
            </div>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhotos(e.target.files)} />
            <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary">
                    <img src={URL.createObjectURL(f)} className="h-full w-full object-cover" alt={`Page ${i + 1}`} />
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[10px] text-white">p.{i + 1}</span>
                    <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Each photo becomes one page. Text is read with Gemini vision.</p>
            <Button className="w-full" variant="coral" size="lg" disabled={!photos.length} onClick={() => run(() => ingestImages(title || 'Photographed chapter', photos, (label, pct) => setBusy({ label, pct })))}>
              Read {photos.length || ''} page{photos.length === 1 ? '' : 's'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea className="min-h-[200px]" placeholder="Paste your notes or chapter text…" value={text} onChange={(e) => setText(e.target.value)} />
            <Button className="w-full" variant="coral" size="lg" disabled={text.trim().length < 50} onClick={() => run(() => ingestText(title || 'My notes', text))}>
              Create study kit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
