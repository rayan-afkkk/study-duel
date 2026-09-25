import { LogIn, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { firebaseEnabled, signInTestUser, signInWithGoogle, useEmulators } from '@/lib/firebase'
import { useState } from 'react'
import { Input } from './ui/input'

export function SignInCard({ title = 'Study with friends', desc = 'Sign in with Google to create groups, battle live and hop on voice calls.' }: { title?: string; desc?: string }) {
  if (!firebaseEnabled)
    return (
      <div className="surface mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-gold">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-4xl">Groups need Firebase</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your Firebase web config (<code>VITE_FIREBASE_*</code>) to <code>.env</code> and restart — the README walks you through it in 5 minutes. Everything else in
          StudyDuel works without it.
        </p>
      </div>
    )
  return (
    <div className="surface mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft text-coral">
        <Users className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-4xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Button
        size="lg"
        className="mt-6"
        onClick={() => signInWithGoogle().catch((e) => toast.error((e as Error).message))}
      >
        <LogIn /> Sign in with Google
      </Button>
      {useEmulators && <EmulatorSignIn />}
    </div>
  )
}

function EmulatorSignIn() {
  const [name, setName] = useState('')
  return (
    <div className="mt-6 space-y-2 border-t pt-6">
      <p className="text-xs text-muted-foreground">Emulator mode — sign in as a test user</p>
      <div className="flex gap-2">
        <Input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="secondary" disabled={!name.trim()} onClick={() => signInTestUser(name.trim())}>
          Enter
        </Button>
      </div>
    </div>
  )
}
