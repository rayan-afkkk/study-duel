/** Upload pipeline: PDF / text / photos → per-page chunks with page numbers in IndexedDB. */
import { db, type Chunk, type StudyDoc } from './db'
import { callAi } from './aiClient'
import { imageToBase64, uid } from './utils'

const CHUNK_SIZE = 1800

export function chunkPage(docId: string, page: number, text: string, image?: Blob): Chunk[] {
  const clean = text.replace(/\r/g, '').trim()
  if (!clean) return [{ docId, page, text: '', image }]
  const out: Chunk[] = []
  const paras = clean.split(/\n{2,}/)
  let buf = ''
  for (const para of paras) {
    if ((buf + '\n\n' + para).length > CHUNK_SIZE && buf) {
      out.push({ docId, page, text: buf })
      buf = para
    } else buf = buf ? `${buf}\n\n${para}` : para
  }
  if (buf) out.push({ docId, page, text: buf })
  if (image && out[0]) out[0].image = image
  return out
}

/** Split plain text into pseudo-pages (~2500 chars, or form-feeds) so citations still work. */
function splitTextPages(text: string) {
  const byFF = text.split('\f')
  if (byFF.length > 1) return byFF
  const pages: string[] = []
  const paras = text.split(/\n{2,}/)
  let buf = ''
  for (const p of paras) {
    if ((buf + p).length > 2500 && buf) {
      pages.push(buf)
      buf = p
    } else buf = buf ? `${buf}\n\n${p}` : p
  }
  if (buf) pages.push(buf)
  return pages.length ? pages : [text]
}

export type Progress = (label: string, pct: number) => void

const nextColor = async () => (await db.documents.count()) % 5

export async function ingestPdf(file: File, onProgress?: Progress) {
  const { extractPdfText } = await import('./pdf')
  onProgress?.('Reading PDF pages…', 0.05)
  const { pages, numPages } = await extractPdfText(file, (p) => onProgress?.('Extracting text…', 0.05 + p * 0.9))
  const totalText = pages.reduce((n, p) => n + p.text.length, 0)
  if (totalText < 40) throw new Error('This PDF has no selectable text (it may be scanned). Upload photos of the pages instead so we can read them with AI.')
  const id = uid()
  const doc: StudyDoc = {
    id,
    title: file.name.replace(/\.pdf$/i, ''),
    kind: 'pdf',
    createdAt: Date.now(),
    pageCount: numPages,
    pdf: file,
    color: await nextColor(),
  }
  await db.transaction('rw', db.documents, db.chunks, async () => {
    await db.documents.add(doc)
    await db.chunks.bulkAdd(pages.flatMap((p) => chunkPage(id, p.page, p.text)))
  })
  onProgress?.('Done', 1)
  return doc
}

export async function ingestText(title: string, text: string) {
  const id = uid()
  const pages = splitTextPages(text)
  const doc: StudyDoc = { id, title, kind: 'text', createdAt: Date.now(), pageCount: pages.length, color: await nextColor() }
  await db.transaction('rw', db.documents, db.chunks, async () => {
    await db.documents.add(doc)
    await db.chunks.bulkAdd(pages.flatMap((t, i) => chunkPage(id, i + 1, t)))
  })
  return doc
}

/** Photos of book pages → Gemini vision OCR (one page per photo). */
export async function ingestImages(title: string, files: File[], onProgress?: Progress) {
  const id = uid()
  const chunks: Chunk[] = []
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`Reading page ${i + 1} of ${files.length} with AI…`, i / files.length)
    const img = await imageToBase64(files[i])
    const res = await callAi('ocr', { images: [{ mimeType: img.mimeType, data: img.data }] })
    chunks.push(...chunkPage(id, i + 1, res.data.text, img.blob))
  }
  const doc: StudyDoc = { id, title, kind: 'image', createdAt: Date.now(), pageCount: files.length, color: await nextColor() }
  await db.transaction('rw', db.documents, db.chunks, async () => {
    await db.documents.add(doc)
    await db.chunks.bulkAdd(chunks)
  })
  onProgress?.('Done', 1)
  return doc
}
