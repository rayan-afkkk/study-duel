import { useEffect, useState } from 'react'
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore'

/** Realtime Firestore document. Pass null to disable. */
export function useDoc<T>(ref: DocumentReference | null, deps: unknown[] = []) {
  const [data, setData] = useState<(T & { id: string }) | null | undefined>(undefined)
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!ref) return setData(undefined)
    return onSnapshot(
      ref,
      (snap) => setData(snap.exists() ? ({ id: snap.id, ...(snap.data() as T) } as T & { id: string }) : null),
      (e) => setError(e.message),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, error, loading: data === undefined && !error }
}

/** Realtime Firestore query. Pass null to disable. */
export function useCollection<T>(q: Query | null, deps: unknown[] = []) {
  const [data, setData] = useState<(T & { id: string })[]>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!q) return setData(undefined)
    return onSnapshot(
      q,
      (snap) => setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))),
      (e) => setError(e.message),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, error, loading: data === undefined && !error }
}
