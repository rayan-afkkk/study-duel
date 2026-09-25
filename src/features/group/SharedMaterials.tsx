import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderBy, query } from 'firebase/firestore'
import { Download, FileText, Layers, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCollection } from '@/hooks/useFirestore'
import { importShared, sharedCol, type SharedMaterial } from '@/lib/groups'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { relativeTime } from '@/lib/utils'

export function useShared(gid: string) {
  return useCollection<SharedMaterial>(query(sharedCol(gid), orderBy('createdAt', 'desc')), [gid])
}

export function SharedMaterials({ gid, shared }: { gid: string; shared: ReturnType<typeof useShared> }) {
  const nav = useNavigate()
  const [busy, setBusy] = useState<string>()
  void gid
  const doImport = async (s: SharedMaterial & { id: string }) => {
    setBusy(s.id)
    try {
      const id = await importShared(s)
      toast.success('Added to your library!')
      nav(`/doc/${id}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(undefined)
    }
  }
  if (!shared.data?.length)
    return <EmptyState icon={<FileText />} title="Nothing shared yet" desc="Open any chapter and tap “Share to group” to send its text and flashcards here." />
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {shared.data.map((s) => (
        <div key={s.id} className="surface flex flex-col p-5">
          <p className="text-lg font-bold">{s.title}</p>
          <p className="text-xs text-muted-foreground">
            by {s.sharedByName} · {s.createdAt ? relativeTime(s.createdAt.toMillis()) : 'now'}
          </p>
          <div className="mt-3 flex gap-2">
            <span className="chip-muted">
              <FileText className="h-3 w-3" /> {s.pages.length} pages
            </span>
            <span className="chip-muted">
              <Layers className="h-3 w-3" /> {s.flashcards.length} cards
            </span>
          </div>
          <Button className="mt-4 self-start" size="sm" variant="secondary" disabled={busy === s.id} onClick={() => doImport(s)}>
            {busy === s.id ? <Loader2 className="animate-spin" /> : <Download />} Study this
          </Button>
        </div>
      ))}
    </div>
  )
}
