import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDoc } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'
import { CodeInput } from '@/components/CodeInput'
import { Button } from '@/components/ui/button'
import { SignInCard } from '@/components/SignInCard'
import { ErrorCard } from '@/components/AsyncState'
import { useAuth } from '@/lib/firebase'
import { groupRef, joinGroupByCode } from '@/lib/groups'

/** /join/:code — landing spot for invite QR codes (phones). Joins the group, then jumps into a live battle if one is running. */
export default function Join() {
  const { code: param } = useParams()
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const [code, setCode] = useState(param ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const tried = useRef(false)

  const join = async (c: string) => {
    if (!user) return
    setBusy(true)
    setError(undefined)
    try {
      const gid = await joinGroupByCode(c, user)
      const g = await getDoc(groupRef(gid))
      const battle = g.data()?.activeBattleId
      nav(battle ? `/battle/${gid}/${battle}` : `/groups/${gid}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (param && user && !tried.current) {
      tried.current = true
      join(param)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, user])

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin" />
  if (!user) return <SignInCard title="Join your friends" desc="Sign in with Google to join the group and the live battle." />

  return (
    <div className="mx-auto max-w-md pt-6 text-center">
      <h1 className="text-6xl">Join</h1>
      <p className="mt-2 text-muted-foreground">Enter the 6-digit code from your friend’s screen.</p>
      <CodeInput className="mt-8" value={code} onChange={setCode} onComplete={join} />
      <Button className="mt-6 w-full" size="xl" variant="coral" disabled={busy || code.length !== 6} onClick={() => join(code)}>
        {busy && <Loader2 className="animate-spin" />} Let’s go
      </Button>
      {error && (
        <div className="mt-6">
          <ErrorCard error={error} onRetry={() => join(code)} />
        </div>
      )}
    </div>
  )
}
