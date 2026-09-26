import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiTask, TaskDataMap } from '@shared/schemas'
import { generate, getCached } from '@/lib/aiClient'

export type AiStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Loads a task result from the IndexedDB cache or generates it via /api/ai.
 * With `auto`, generation starts automatically when nothing is cached.
 */
export function useAiTask<T extends AiTask>(
  task: T,
  docId: string | undefined,
  params: Record<string, unknown>,
  opts: {
    auto?: boolean
    extra?: Record<string, unknown>
    /** extra payload computed right before generating (not part of the cache key) */
    extraAsync?: () => Promise<Record<string, unknown>>
    onData?: (d: TaskDataMap[T]) => void
  } = {},
) {
  const [status, setStatus] = useState<AiStatus>('idle')
  const [data, setData] = useState<TaskDataMap[T] | undefined>()
  const [error, setError] = useState<string>()
  const paramsKey = JSON.stringify(params)
  const reqId = useRef(0)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const run = useCallback(
    async (force = false) => {
      if (!docId) return
      const id = ++reqId.current
      setStatus('loading')
      setError(undefined)
      try {
        const extra = { ...optsRef.current.extra, ...(await optsRef.current.extraAsync?.()) }
        const d = await generate(task, { docId, params: JSON.parse(paramsKey), extra, force })
        if (id !== reqId.current) return
        setData(d)
        setStatus('success')
        optsRef.current.onData?.(d)
      } catch (e) {
        if (id !== reqId.current) return
        setError((e as Error).message)
        setStatus('error')
      }
    },
    [task, docId, paramsKey],
  )

  useEffect(() => {
    if (!docId) return
    let cancelled = false
    const id = ++reqId.current
    getCached(task, docId, JSON.parse(paramsKey)).then((c) => {
      if (cancelled || id !== reqId.current) return
      if (c) {
        setData(c)
        setStatus('success')
        optsRef.current.onData?.(c)
      } else {
        setData(undefined)
        setStatus('idle')
        if (optsRef.current.auto) run()
      }
    })
    return () => {
      cancelled = true
    }
  }, [task, docId, paramsKey, run])

  return { status, data, error, run, regenerate: () => run(true) }
}
