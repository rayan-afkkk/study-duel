/**
 * Frontend AI client. Calls the /api/ai serverless function (never a provider directly),
 * and caches every generated result in IndexedDB so the same content is never generated twice.
 */
import type { AiImage, AiResponse, AiTask, TaskDataMap } from '@shared/schemas'
import { db, getDocContext } from './db'
import { hash } from './utils'

export class AiError extends Error {
  constructor(
    message: string,
    public attempts?: { provider: string; key: string; error: string }[],
  ) {
    super(message)
  }
}

/** Where the serverless API lives. Empty = same origin (Vercel / `npm run dev`). Set VITE_API_BASE_URL when the
 *  frontend is hosted elsewhere (e.g. Lovable) and the API is deployed on Vercel. */
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

/** Raw call to /api/ai with no caching. */
export async function callAi<T extends AiTask>(task: T, payload: Record<string, unknown> & { images?: AiImage[] }) {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/ai`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, payload }),
    })
  } catch {
    throw new AiError("Can't reach the StudyDuel AI server. Check your internet connection.")
  }
  let json: AiResponse<TaskDataMap[T]>
  try {
    json = await res.json()
  } catch {
    throw new AiError(
      res.status === 404
        ? 'The AI server is not running here. Use `npm run dev` or deploy to Vercel (see README).'
        : `The AI server returned an unexpected response (${res.status}).`,
    )
  }
  if (!json.ok) throw new AiError(json.error, json.attempts)
  return json
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  return `{${Object.keys(v as object)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
    .join(',')}}`
}

export const cacheKey = (task: AiTask, docId: string, params: Record<string, unknown> = {}) =>
  `${task}:${docId}:${hash(stableStringify(params))}`

export async function getCached<T extends AiTask>(task: T, docId: string, params: Record<string, unknown> = {}) {
  const row = await db.aiCache.get(cacheKey(task, docId, params))
  return (row?.data as TaskDataMap[T] | undefined) ?? undefined
}

export async function putCached(task: AiTask, docId: string, params: Record<string, unknown>, data: unknown) {
  await db.aiCache.put({ key: cacheKey(task, docId, params), task, docId, createdAt: Date.now(), data })
}

const inflight = new Map<string, Promise<unknown>>()

/**
 * Generate (or load from cache) a task result for a document.
 * `params` are the settings that change the output (language, difficulty, board…) and form the cache key.
 */
export async function generate<T extends AiTask>(
  task: T,
  opts: { docId: string; params?: Record<string, unknown>; extra?: Record<string, unknown>; force?: boolean; context?: boolean },
): Promise<TaskDataMap[T]> {
  const params = opts.params ?? {}
  const key = cacheKey(task, opts.docId, params)
  if (!opts.force) {
    const cached = await getCached(task, opts.docId, params)
    if (cached) return cached
    const running = inflight.get(key)
    if (running) return running as Promise<TaskDataMap[T]>
  }
  const p = (async () => {
    const context = opts.context === false ? undefined : await getDocContext(opts.docId)
    const res = await callAi(task, { ...params, ...opts.extra, context })
    await putCached(task, opts.docId, params, res.data)
    return res.data
  })()
  inflight.set(key, p)
  try {
    return await p
  } finally {
    inflight.delete(key)
  }
}
