import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { db, getPages, type StudyDoc } from '@/lib/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { cn, isUrduScript } from '@/lib/utils'

interface OpenArgs {
  docId?: string
  pages?: { page: number; text: string }[]
  title?: string
  page: number
}

const Ctx = createContext<{ open: (a: OpenArgs) => void }>({ open: () => {} })
export const useDocViewer = () => useContext(Ctx)

/** Global citation viewer: opens the exact page of a PDF (pdf.js), photo, or text document. */
export function DocViewerProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null)
  return (
    <Ctx.Provider value={{ open: setArgs }}>
      {children}
      <Dialog open={!!args} onOpenChange={(o) => !o && setArgs(null)}>
        <DialogContent className="max-w-3xl">{args && <Viewer args={args} />}</DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}

function Viewer({ args }: { args: OpenArgs }) {
  const [doc, setDoc] = useState<StudyDoc | null>(null)
  const [pages, setPages] = useState<{ page: number; text: string; image?: Blob }[]>(args.pages ?? [])
  const [page, setPage] = useState(args.page)
  useEffect(() => {
    if (!args.docId) return
    db.documents.get(args.docId).then((d) => setDoc(d ?? null))
    getPages(args.docId).then(setPages)
  }, [args.docId])
  const total = doc?.pageCount ?? pages.length
  const current = pages.find((p) => p.page === page)
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">{doc?.title ?? args.title ?? 'Source'}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Page {page} {total ? `of ${total}` : ''}
        </p>
      </DialogHeader>
      <div className="min-h-[50vh] overflow-hidden rounded-2xl border bg-background">
        {doc?.pdf ? (
          <PdfPage blob={doc.pdf} page={page} />
        ) : current?.image ? (
          <ImagePage blob={current.image} text={current.text} />
        ) : current ? (
          <div className={cn('whitespace-pre-wrap p-6 font-serif text-lg leading-8 md:p-10', isUrduScript(current.text) && 'urdu')}>
            {current.text}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText /> This page isn't available.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft /> Prev
        </Button>
        <span className="chip-muted">Page {page}</span>
        <Button variant="secondary" size="sm" disabled={!!total && page >= total} onClick={() => setPage(page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </>
  )
}

function PdfPage({ blob, page }: { blob: Blob; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    import('@/lib/pdf').then(async ({ openPdf, renderPdfPage }) => {
      const pdf = await openPdf(blob)
      if (cancelled || !canvas.current) return
      await renderPdfPage(pdf, Math.min(page, pdf.numPages), canvas.current, (wrap.current?.clientWidth ?? 700) - 2)
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [blob, page])
  return (
    <div ref={wrap} className="relative bg-white">
      {loading && <Skeleton className="absolute inset-0 rounded-none" />}
      <canvas ref={canvas} className="mx-auto block" />
    </div>
  )
}

function ImagePage({ blob, text }: { blob: Blob; text: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      {url && <img src={url} alt="Book page" className="w-full rounded-xl" />}
      <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{text}</div>
    </div>
  )
}

/** "Page X" citation badge — click to open that exact page. */
export function PageBadge({ page, docId, pages, title, className }: { page?: number | null; docId?: string; pages?: OpenArgs['pages']; title?: string; className?: string }) {
  const { open } = useDocViewer()
  if (!page) return null
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        open({ docId, pages, title, page })
      }}
      className={cn('chip-gold transition hover:brightness-125 active:scale-95', className)}
      title="Open source page"
    >
      <FileText className="h-3 w-3" /> Page {page}
    </button>
  )
}
