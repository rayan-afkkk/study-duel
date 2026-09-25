/**
 * Web Speech API helpers: sentence-by-sentence TTS (with highlight + mouth events) and STT.
 */
import type { Language } from '@shared/schemas'

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window
export const sttSupported = () =>
  typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

const LANG_CODES: Record<Language, string[]> = {
  en: ['en-GB', 'en-US', 'en-IN', 'en'],
  ur: ['ur-PK', 'ur-IN', 'ur', 'hi-IN'],
  roman: ['en-IN', 'hi-IN', 'en-GB', 'en'],
}

let voicesCache: SpeechSynthesisVoice[] = []
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([])
  const v = speechSynthesis.getVoices()
  if (v.length) return Promise.resolve((voicesCache = v))
  return new Promise((resolve) => {
    const done = () => resolve((voicesCache = speechSynthesis.getVoices()))
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1200)
  })
}

/** Pick up to `count` distinct voices for a language (for two podcast hosts). */
export function pickVoices(lang: Language, count = 1): SpeechSynthesisVoice[] {
  const voices = voicesCache.length ? voicesCache : ttsSupported() ? speechSynthesis.getVoices() : []
  const out: SpeechSynthesisVoice[] = []
  for (const code of LANG_CODES[lang]) {
    const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(code.toLowerCase()))
    // prefer natural/online voices
    matches.sort((a, b) => Number(/natural|online|google/i.test(b.name)) - Number(/natural|online|google/i.test(a.name)))
    for (const m of matches) if (!out.includes(m)) out.push(m)
    if (out.length >= count) break
  }
  return out.slice(0, count)
}

export const langCode = (lang: Language) => LANG_CODES[lang][0]

export function splitSentences(text: string): string[] {
  const clean = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const parts = clean.match(/[^.!?۔؟]+[.!?۔؟]*["')\]]*\s*/g) ?? [clean]
  return parts.map((s) => s.trim()).filter(Boolean)
}

export interface SpeakItem {
  text: string
  voice?: SpeechSynthesisVoice
  pitch?: number
  lang?: string
}

export interface PlayerEvents {
  onIndex?: (i: number) => void
  onBoundary?: () => void
  onState?: (s: 'playing' | 'paused' | 'stopped') => void
}

/**
 * Plays a queue of utterances one by one. Short utterances avoid Chrome's ~15s cut-off bug
 * and let us highlight the sentence being read.
 */
export class SpeechQueue {
  private items: SpeakItem[] = []
  private index = 0
  private state: 'playing' | 'paused' | 'stopped' = 'stopped'
  private token = 0
  rate = 1

  constructor(private events: PlayerEvents = {}) {}

  load(items: SpeakItem[]) {
    this.stop()
    this.items = items
    this.index = 0
  }

  get current() {
    return this.index
  }
  get status() {
    return this.state
  }

  play(from = this.index) {
    if (!ttsSupported() || !this.items.length) return
    speechSynthesis.cancel()
    this.index = Math.max(0, Math.min(from, this.items.length - 1))
    this.setState('playing')
    this.speakCurrent()
  }

  pause() {
    if (this.state !== 'playing') return
    this.token++
    speechSynthesis.cancel() // cancel + replay current sentence is more reliable than speechSynthesis.pause()
    this.setState('paused')
  }

  resume() {
    if (this.state === 'paused') this.play(this.index)
  }

  stop() {
    this.token++
    if (ttsSupported()) speechSynthesis.cancel()
    this.setState('stopped')
  }

  setRate(rate: number) {
    this.rate = rate
    if (this.state === 'playing') this.play(this.index)
  }

  private setState(s: 'playing' | 'paused' | 'stopped') {
    this.state = s
    this.events.onState?.(s)
  }

  private speakCurrent() {
    const item = this.items[this.index]
    if (!item) {
      this.setState('stopped')
      this.events.onIndex?.(-1)
      return
    }
    const token = ++this.token
    const u = new SpeechSynthesisUtterance(item.text)
    u.rate = this.rate
    u.pitch = item.pitch ?? 1
    if (item.voice) u.voice = item.voice
    u.lang = item.voice?.lang ?? item.lang ?? 'en-GB'
    u.onboundary = () => token === this.token && this.events.onBoundary?.()
    u.onend = () => {
      if (token !== this.token || this.state !== 'playing') return
      this.index++
      this.speakCurrent()
    }
    u.onerror = (e) => {
      if (token !== this.token) return
      if (e.error === 'interrupted' || e.error === 'canceled') return
      this.index++
      this.speakCurrent()
    }
    this.events.onIndex?.(this.index)
    speechSynthesis.speak(u)
  }
}

/** Speak a single string and resolve when finished. */
export function speakOnce(text: string, lang: Language = 'en', rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const [voice] = pickVoices(lang)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? langCode(lang)
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

/** Speech-to-text. Returns a stop function. */
export function listen(
  lang: Language,
  handlers: { onText: (text: string, final: boolean) => void; onEnd?: () => void; onError?: (msg: string) => void },
  opts: { continuous?: boolean } = {},
) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    handlers.onError?.('Speech recognition is not supported in this browser. Try Chrome or Edge.')
    return () => {}
  }
  const rec = new SR()
  rec.lang = lang === 'ur' ? 'ur-PK' : lang === 'roman' ? 'en-IN' : 'en-US'
  rec.interimResults = true
  rec.continuous = !!opts.continuous
  let finalText = ''
  rec.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript + ' '
      else interim += r[0].transcript
    }
    handlers.onText((finalText + interim).trim(), !interim)
  }
  rec.onerror = (e: any) => handlers.onError?.(e.error === 'not-allowed' ? 'Microphone permission denied.' : `Mic error: ${e.error}`)
  rec.onend = () => handlers.onEnd?.()
  rec.start()
  return () => {
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
  }
}
