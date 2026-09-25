import { useEffect, useState } from 'react'
import { getStats, PROGRESS_EVENT, readiness, type Stats } from '@/lib/progress'

export function useStats() {
  const [stats, setStats] = useState<Stats>()
  useEffect(() => {
    const load = () => getStats().then(setStats)
    load()
    window.addEventListener(PROGRESS_EVENT, load)
    return () => window.removeEventListener(PROGRESS_EVENT, load)
  }, [])
  return stats
}

export function useReadiness(docId?: string) {
  const [r, setR] = useState<Awaited<ReturnType<typeof readiness>>>()
  useEffect(() => {
    const load = () => readiness(docId).then(setR)
    load()
    window.addEventListener(PROGRESS_EVENT, load)
    return () => window.removeEventListener(PROGRESS_EVENT, load)
  }, [docId])
  return r
}
