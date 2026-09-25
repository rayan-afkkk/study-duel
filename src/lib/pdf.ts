/** pdf.js helpers — text extraction per page and page rendering for the citation viewer. */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>

export async function openPdf(data: Blob | ArrayBuffer): Promise<PdfDoc> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data
  return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
}

export async function extractPdfText(file: Blob, onProgress?: (p: number) => void) {
  const pdf = await openPdf(file)
  const pages: { page: number; text: string }[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    let lastY: number | undefined
    for (const item of content.items as { str?: string; transform?: number[]; hasEOL?: boolean }[]) {
      if (typeof item.str !== 'string') continue
      const y = item.transform?.[5]
      if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 4) text += '\n'
      text += item.str + (item.hasEOL ? '\n' : ' ')
      lastY = y
    }
    pages.push({ page: i, text: text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() })
    onProgress?.(i / pdf.numPages)
  }
  return { pages, numPages: pdf.numPages }
}

export async function renderPdfPage(pdf: PdfDoc, pageNum: number, canvas: HTMLCanvasElement, width: number) {
  const page = await pdf.getPage(pageNum)
  const base = page.getViewport({ scale: 1 })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewport = page.getViewport({ scale: (width / base.width) * dpr })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width / dpr}px`
  canvas.style.height = `${viewport.height / dpr}px`
  await page.render({ canvas, viewport }).promise
}
