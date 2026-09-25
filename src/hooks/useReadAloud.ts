import { useEffect, useMemo, useRef, useState } from 'react'
import type { Language } from '@shared/schemas'
import { loadVoices, pickVoices, SpeechQueue, langCode, type SpeakItem } from '@/lib/speech'
import { getSettings, setSettings } from '@/lib/settings'

/** Sentence-by-sentence read-aloud with highlight index, speed control and mouth "pulse". */
export function useReadAloud(sentences: string[], lang: Language) {
  const [index, setIndex] = useState(-1)
  const [state, setState] = useState<'playing' | 'paused' | 'stopped'>('stopped')
  const [pulse, setPulse] = useState(0)
  const [rate, setRateState] = useState(getSettings().speechRate)
  const queue = useRef<SpeechQueue | null>(null)

  if (!queue.current) {
    queue.current = new SpeechQueue({
      onIndex: setIndex,
      onState: setState,
      onBoundary: () => setPulse((p) => p + 1),
    })
    queue.current.rate = rate
  }

  const key = useMemo(() => sentences.join('|'), [sentences])

  useEffect(() => {
    let cancelled = false
    loadVoices().then(() => {
      if (cancelled) return
      const [voice] = pickVoices(lang)
      const items: SpeakItem[] = sentences.map((text) => ({ text, voice, lang: langCode(lang) }))
      queue.current!.load(items)
      setIndex(-1)
    })
    return () => {
      cancelled = true
      queue.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang])

  return {
    index,
    state,
    pulse,
    rate,
    play: (from?: number) => queue.current!.play(from ?? (index >= 0 ? index : 0)),
    pause: () => queue.current!.pause(),
    resume: () => queue.current!.resume(),
    stop: () => {
      queue.current!.stop()
      setIndex(-1)
    },
    setRate: (r: number) => {
      setRateState(r)
      setSettings({ speechRate: r })
      queue.current!.setRate(r)
    },
  }
}
