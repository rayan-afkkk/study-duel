import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { firebaseEnabled, signInWithGoogle, useAuth } from '@/lib/firebase'
import { myGroupsQuery, shareDocument, type Group } from '@/lib/groups'
import { useCollection } from '@/hooks/useFirestore'

export function ShareToGroupDialog({ open, onOpenChange, docId }: { open: boolean; onOpenChange: (o: boolean) => void; docId: string }) {
  const { user } = useAuth()
  const groups = useCollection<Group>(open && user ? myGroupsQuery(user.uid) : null, [open, user?.uid])
  const [busy, setBusy] = useState<string>()

  const share = async (gid: string) => {
    if (!user) return
    setBusy(gid)
    try {
      await shareDocument(gid, docId, user)
      toast.success('Shared! Your friends can now import it.')
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share to a group</DialogTitle>
          <DialogDescription>Shares the chapter text and its flashcards with your group.</DialogDescription>
        </DialogHeader>
        {!firebaseEnabled ? (
          <p className="text-sm text-muted-foreground">Groups need Firebase — see README to configure it.</p>
        ) : !user ? (
          <Button onClick={() => signInWithGoogle()}>Sign in with Google</Button>
        ) : groups.loading ? (
          <Loader2 className="mx-auto animate-spin" />
        ) : groups.data?.length ? (
          <div className="space-y-2">
            {groups.data.map((g) => (
              <button key={g.id} disabled={!!busy} onClick={() => share(g.id)} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:bg-secondary">
                <span className="text-2xl">{g.emoji ?? '📚'}</span>
                <span className="flex-1 font-semibold">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.memberIds.length}/3</span>
                {busy === g.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">You’re not in any group yet.</p>
            <Button asChild className="mt-4" variant="coral">
              <Link to="/groups">Create a group</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
