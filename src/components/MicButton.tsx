import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { Language } from '@shared/schemas'
import { listen, sttSupported } from '@/lib/speech'
import { cn } from '@/lib/utils'

/** Push-to-talk dictation button (Web Speech API). */
export function MicButton({ lang, onText, className, continuous = true }: { lang: Language; onText: (text: string, final: boolean) => void; className?: string; continuous?: boolean }) {
  const [on, setOn] = useState(false)
  const stop = useRef<() => void>(undefined)
  if (!sttSupported()) return null
  const toggle = () => {
    if (on) {
      stop.current?.()
      setOn(false)
      return
    }
    setOn(true)
    stop.current = listen(
      lang,
      {
        onText,
        onEnd: () => setOn(false),
        onError: (m) => {
          toast.error(m)
          setOn(false)
        },
      },
      { continuous },
    )
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn('relative flex h-12 w-12 items-center justify-center rounded-full transition', on ? 'bg-coral text-white' : 'bg-secondary hover:bg-accent', className)}
      aria-label={on ? 'Stop listening' : 'Speak'}
    >
      {on && <motion.span className="absolute inset-0 rounded-full bg-coral" animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
      {on ? <Square className="relative h-4 w-4" /> : <Mic className="relative h-5 w-5" />}
    </button>
  )
}
