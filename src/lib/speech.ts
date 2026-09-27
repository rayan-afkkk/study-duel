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

/** Rough quality score: neural/online voices sound far more human than the old offline ones. */
function voiceQuality(v: SpeechSynthesisVoice) {
  const n = v.name
  let q = 0
  if (/natural|neural/i.test(n)) q += 60
  if (/online/i.test(n)) q += 25
  if (/premium|enhanced/i.test(n)) q += 35
  if (/google/i.test(n)) q += 20
  if (/samantha|daniel|karen|moira|serena|arthur|aria|jenny|guy|sonia|ryan|libby|neerja|prabhat|asad|uzma|salman|gul|swara|madhur/i.test(n)) q += 15
  if (/espeak|compact|robot|zarvox|albert|bad news|bells|bubbles|cellos|whisper|trinoids|jester|organ|superstar|wobble/i.test(n)) q -= 80
  return q
}

const FEMALE = /female|woman|samantha|karen|moira|serena|aria|jenny|sonia|libby|neerja|uzma|gul|swara|zira|susan|hazel|heera|kalpana|tessa|fiona|victoria|allison|ava|emma|olivia|natasha|clara|salma/i
const MALE = /\bmale\b|\bman\b|daniel|arthur|guy|ryan|prabhat|asad|salman|madhur|david|mark|george|ravi|hemant|alex|fred|thomas|oliver|william|james|brian|christopher|eric|roger|steffan/i
export const voiceGender = (v?: SpeechSynthesisVoice) => (!v ? undefined : FEMALE.test(v.name) ? 'f' : MALE.test(v.name) ? 'm' : undefined)

/** Voices for a language, most natural-sounding first. */
export function rankedVoices(lang: Language): SpeechSynthesisVoice[] {
  const voices = voicesCache.length ? voicesCache : ttsSupported() ? speechSynthesis.getVoices() : []
  const codes = LANG_CODES[lang]
  const scored: { v: SpeechSynthesisVoice; score: number }[] = []
  for (const v of voices) {
    const idx = codes.findIndex((c) => v.lang.toLowerCase().replace('_', '-').startsWith(c.toLowerCase()))
    if (idx < 0) continue
    scored.push({ v, score: voiceQuality(v) + (codes.length - idx) * 6 })
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.v)
}

/** Pick up to `count` distinct voices for a language (for two podcast hosts). */
export function pickVoices(lang: Language, count = 1): SpeechSynthesisVoice[] {
  return rankedVoices(lang).slice(0, count)
}

/** A female and a male voice for the two podcast hosts (falls back to the best voices available). */
export function pickHostVoices(lang: Language): [SpeechSynthesisVoice | undefined, SpeechSynthesisVoice | undefined] {
  const ranked = rankedVoices(lang)
  const f = ranked.find((v) => voiceGender(v) === 'f')
  const m = ranked.find((v) => voiceGender(v) === 'm')
  const a = f ?? ranked[0]
  const b = m && m !== a ? m : ranked.find((v) => v !== a) ?? a
  return [a, b]
}

export const langCode = (lang: Language) => LANG_CODES[lang][0]

export function splitSentences(text: string): string[] {
  const clean = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const parts = clean.match(/[^.!?۔؟]+[.!?۔؟]*["')\]]*\s*/g) ?? [clean]
  return parts.map((s) => s.trim()).filter(Boolean)
}

/**
 * Rewrite text the way a person would read it aloud: no markdown symbols, abbreviations and
 * science symbols spoken as words, brackets read as a short aside.
 */
export function humanize(text: string, lang?: string): string {
  let t = text
    .replace(/\*\*|__|`|#+\s|^\s*[-•*]\s+/gm, '')
    .replace(/\s*\(([^)]{1,80})\)/g, ', $1,')
    .replace(/\s*(?:→|->|⟶|=>)\s*/g, ', which gives ')
    .replace(/\s*…|\.\.\./g, '... ')
  if (!lang || lang.startsWith('en')) {
    t = t
      .replace(/\be\.g\.,?/gi, 'for example,')
      .replace(/\bi\.e\.,?/gi, 'that is,')
      .replace(/\betc\./gi, 'et cetera.')
      .replace(/\bvs\.?\s/gi, 'versus ')
      .replace(/\bapprox\.\s/gi, 'approximately ')
      .replace(/\bFig\.\s/g, 'Figure ')
      .replace(/\bEq\.\s/g, 'Equation ')
      .replace(/\bNo\.\s(?=\d)/g, 'number ')
      .replace(/\bm\/s(²|\^2)/g, 'metres per second squared')
      .replace(/\bm\/s\b/g, 'metres per second')
      .replace(/\bkm\/h\b/g, 'kilometres per hour')
      .replace(/\s*°\s?C\b/g, ' degrees Celsius')
      .replace(/\s*°\s?F\b/g, ' degrees Fahrenheit')
      .replace(/\s*°/g, ' degrees')
      .replace(/\s*≈\s*/g, ' is about ')
      .replace(/\s*≠\s*/g, ' is not equal to ')
      .replace(/\s*≤\s*/g, ' is less than or equal to ')
      .replace(/\s*≥\s*/g, ' is greater than or equal to ')
      .replace(/(\S)\s*=\s*(?=\S)/g, '$1 equals ')
      .replace(/(\d)\s*[×x]\s*(?=\d)/g, '$1 times ')
      .replace(/\s*×\s*/g, ' times ')
      .replace(/\s*÷\s*/g, ' divided by ')
      .replace(/\s*±\s*/g, ' plus or minus ')
      .replace(/(²|\^2)/g, ' squared')
      .replace(/(³|\^3)/g, ' cubed')
      .replace(/\band\/or\b/gi, 'and or')
      .replace(/\b([A-Za-z0-9]{1,3})\/([A-Za-z0-9]{1,3})\b/g, '$1 over $2')
      .replace(/\s&\s/g, ' and ')
  }
  return t.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/,\s*([.!?])/g, '$1').replace(/\s+/g, ' ').trim()
}

/** Pause after a phrase, in ms at normal speed, based on how it ends (like a person breathing). */
function pauseFor(chunk: string) {
  if (/(\.\.\.|…)["')\]]*$/.test(chunk)) return 520
  if (/[?؟]["')\]]*$/.test(chunk)) return 460
  if (/[!]["')\]]*$/.test(chunk)) return 420
  if (/[.۔]["')\]]*$/.test(chunk)) return 400
  if (/[;:]$/.test(chunk)) return 300
  if (/[—–-]$/.test(chunk)) return 260
  if (/[,،]$/.test(chunk)) return 190
  return 120
}

/**
 * Split text into natural phrases (sentences, then clauses at , ; : and dashes) with a pause after each.
 * Tiny fragments are merged so the voice doesn't stutter.
 */
export function toPhrases(text: string, splitClauses = true): { text: string; pause: number }[] {
  const sentences = text.match(/[^.!?۔؟]+(?:\.\.\.|[.!?۔؟])*["')\]]*\s*/g) ?? [text]
  const out: { text: string; pause: number }[] = []
  for (const raw of sentences) {
    const sent = raw.trim()
    if (!sent) continue
    const parts = splitClauses ? sent.match(/[^,،;:—–]+(?:[,،;:—–]|$)/g) ?? [sent] : [sent]
    let buf = ''
    for (const p of parts) {
      buf += (buf ? ' ' : '') + p.trim()
      if (buf.split(/\s+/).length >= 4) {
        out.push({ text: buf, pause: pauseFor(buf) })
        buf = ''
      }
    }
    if (buf) {
      if (out.length && buf.split(/\s+/).length < 3 && !/[.!?۔؟]$/.test(out[out.length - 1].text)) {
        const last = out[out.length - 1]
        last.text += ' ' + buf
        last.pause = pauseFor(last.text)
      } else out.push({ text: buf, pause: pauseFor(buf) })
    }
  }
  return out
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
    const lang = item.voice?.lang ?? item.lang ?? 'en-GB'
    // Online voices take a moment to start each utterance, so only split them at sentence ends.
    const local = item.voice ? item.voice.localService : true
    const phrases = toPhrases(humanize(item.text, lang), local)
    // A person reads a touch slower than the engine's default, with slight natural variation.
    const rate = this.rate * 0.93
    const basePitch = item.pitch ?? 1
    this.events.onIndex?.(this.index)

    const next = () => {
      if (token !== this.token || this.state !== 'playing') return
      this.index++
      this.speakCurrent()
    }
    const speakPhrase = (j: number) => {
      if (token !== this.token || this.state !== 'playing') return
      const ph = phrases[j]
      if (!ph) return next()
      const u = new SpeechSynthesisUtterance(ph.text)
      const question = /[?؟]["')\]]*$/.test(ph.text)
      u.rate = Math.max(0.5, rate * (question ? 0.96 : 1) * (0.98 + Math.random() * 0.04))
      u.pitch = Math.min(2, basePitch * (question ? 1.04 : 0.99 + Math.random() * 0.02))
      if (item.voice) u.voice = item.voice
      u.lang = lang
      u.onboundary = () => token === this.token && this.events.onBoundary?.()
      const after = () => {
        if (token !== this.token || this.state !== 'playing') return
        const last = j === phrases.length - 1
        const wait = (last ? Math.max(ph.pause, 380) : ph.pause) / this.rate
        setTimeout(() => speakPhrase(j + 1), wait)
      }
      u.onend = after
      u.onerror = (e) => {
        if (token !== this.token) return
        if (e.error === 'interrupted' || e.error === 'canceled') return
        after()
      }
      speechSynthesis.speak(u)
    }
    speakPhrase(0)
  }
}

/** Speak a single string and resolve when finished. */
export function speakOnce(text: string, lang: Language = 'en', rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve()
    speechSynthesis.cancel()
    const [voice] = pickVoices(lang)
    const u = new SpeechSynthesisUtterance(humanize(text, voice?.lang ?? langCode(lang)))
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? langCode(lang)
    u.rate = rate * 0.95
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
