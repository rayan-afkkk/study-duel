import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { ChevronDown, ChevronUp, GripHorizontal, Maximize2, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCall } from './CallProvider'
import { cn } from '@/lib/utils'
import type { CallParticipant } from '@/lib/call/CallManager'

function Avatar({ p, active }: { p: CallParticipant; active: boolean }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <div className="relative">
        <motion.div
          className={cn('absolute -inset-1 rounded-full', active ? 'bg-success/60' : 'bg-transparent')}
          animate={{ scale: active ? 1 + Math.min(p.level * 4, 0.25) : 1 }}
          transition={{ duration: 0.12 }}
        />
        {p.photo ? (
          <img src={p.photo} referrerPolicy="no-referrer" className="relative h-12 w-12 rounded-full border-2 border-card object-cover" alt="" />
        ) : (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-ocean text-lg font-semibold">
            {p.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        {p.muted && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-white">
            <MicOff className="h-3 w-3" />
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-[11px] text-muted-foreground">{p.connection === 'self' ? 'You' : p.name.split(' ')[0]}</span>
      {p.connection !== 'self' && p.connection !== 'connected' && <span className="text-[10px] text-gold">{p.connection}…</span>}
    </div>
  )
}

function Video({ stream, className }: { stream: MediaStream; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return <video ref={ref} autoPlay playsInline muted className={className} />
}

/** Floating, draggable, minimisable call panel — keep studying during the call. */
export function CallPanel() {
  const { state, groupName, leave, toggleMute, toggleShare } = useCall()
  const [min, setMin] = useState(false)
  const [big, setBig] = useState<MediaStream | null>(null)
  const drag = useDragControls()
  const sharer = state.participants.find((p) => p.screen)
  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

  return (
    <>
      <motion.div
        drag
        dragListener={false}
        dragControls={drag}
        dragMomentum={false}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="fixed bottom-24 right-4 z-50 w-[min(92vw,340px)] overflow-hidden rounded-3xl border bg-card/95 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:right-6"
      >
        <div onPointerDown={(e) => drag.start(e)} className="flex cursor-grab touch-none items-center gap-2 border-b px-4 py-2.5 active:cursor-grabbing">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="flex-1 truncate text-sm font-semibold">{state.status === 'joining' ? 'Connecting…' : groupName ?? 'Group call'}</span>
          <span className="text-xs text-muted-foreground">{state.participants.length}/3</span>
          <button onClick={() => setMin(!min)} className="rounded-full p-1 hover:bg-secondary" aria-label={min ? 'Expand' : 'Minimise'}>
            {min ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {!min && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              {sharer?.screen && (
                <button onClick={() => setBig(sharer.screen!)} className="group relative m-3 mb-0 block overflow-hidden rounded-2xl bg-black">
                  <Video stream={sharer.screen} className="aspect-video w-full object-contain" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] text-white">
                    {sharer.connection === 'self' ? 'You are sharing' : `${sharer.name.split(' ')[0]}'s screen`}
                  </span>
                  <Maximize2 className="absolute right-2 top-2 h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
                </button>
              )}
              <div className="flex justify-center gap-3 px-4 py-4">
                {state.participants.map((p) => (
                  <Avatar key={p.uid} p={p} active={state.activeSpeaker === p.uid} />
                ))}
                {state.participants.length <= 1 && state.status === 'in-call' && (
                  <p className="self-center text-xs text-muted-foreground">Waiting for friends to join…</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-center gap-3 border-t px-4 py-3">
          <button
            onClick={toggleMute}
            className={cn('flex h-11 w-11 items-center justify-center rounded-full transition', state.muted ? 'bg-coral text-white' : 'bg-secondary hover:bg-accent')}
            aria-label={state.muted ? 'Unmute' : 'Mute'}
          >
            {state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          {canShare && (
            <button
              onClick={toggleShare}
              className={cn('flex h-11 w-11 items-center justify-center rounded-full transition', state.sharing ? 'bg-gold text-black' : 'bg-secondary hover:bg-accent')}
              aria-label={state.sharing ? 'Stop sharing' : 'Share screen'}
            >
              {state.sharing ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
            </button>
          )}
          <button onClick={leave} className="flex h-11 items-center gap-2 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground" aria-label="Leave call">
            <PhoneOff className="h-5 w-5" /> Leave
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {big && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setBig(null)}>
            <Video stream={big} className="max-h-full max-w-full rounded-2xl" />
            <button className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white" aria-label="Close">
              <X />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
