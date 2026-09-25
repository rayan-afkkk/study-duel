import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { CallManager, type CallSnapshot } from '@/lib/call/CallManager'
import { displayName, useAuth } from '@/lib/firebase'
import { CallPanel } from './CallPanel'

interface CallCtx {
  state: CallSnapshot
  groupId?: string
  groupName?: string
  start: (gid: string, groupName: string) => Promise<void>
  leave: () => Promise<void>
  toggleMute: () => void
  toggleShare: () => void
  manager?: CallManager
}

const IDLE: CallSnapshot = { status: 'idle', participants: [], muted: false, sharing: false }
const Ctx = createContext<CallCtx>({ state: IDLE, start: async () => {}, leave: async () => {}, toggleMute: () => {}, toggleShare: () => {} })
export const useCall = () => useContext(Ctx)

/** Mounted at the app root so a call keeps running while you navigate and study. */
export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const mgr = useRef<CallManager | undefined>(undefined)
  const [state, setState] = useState<CallSnapshot>(IDLE)
  const [group, setGroup] = useState<{ id: string; name: string }>()

  const leave = useCallback(async () => {
    const m = mgr.current
    mgr.current = undefined
    setGroup(undefined)
    setState(IDLE)
    await m?.leave()
  }, [])

  const start = useCallback(
    async (gid: string, name: string) => {
      if (!user) return void toast.error('Sign in to start a call')
      if (mgr.current) {
        if (mgr.current.gid === gid) return
        await leave()
      }
      const m = new CallManager(gid, { uid: user.uid, name: displayName(user), photo: user.photoURL })
      mgr.current = m
      setGroup({ id: gid, name })
      m.subscribe(setState)
      try {
        await m.join()
      } catch (e) {
        toast.error((e as Error).message === 'mic' ? 'Microphone permission is needed for voice calls.' : `Could not join call: ${(e as Error).message}`)
        await leave()
      }
    },
    [user, leave],
  )

  useEffect(() => {
    if (!user && mgr.current) leave()
  }, [user, leave])

  const value: CallCtx = {
    state,
    groupId: group?.id,
    groupName: group?.name,
    start,
    leave,
    manager: mgr.current,
    toggleMute: () => mgr.current?.toggleMute(),
    toggleShare: () => (state.sharing ? mgr.current?.stopShare() : mgr.current?.startShare()),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {state.status !== 'idle' && <CallPanel />}
    </Ctx.Provider>
  )
}
