/** Tiny WebAudio sound effects — no audio files needed. */
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)())

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slideTo?: number, delay = 0) {
  try {
    const c = ac()
    const t = c.currentTime + delay
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + dur)
  } catch {
    /* audio unavailable */
  }
}

function noise(dur: number, vol = 0.25) {
  try {
    const c = ac()
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = c.createBufferSource()
    const g = c.createGain()
    g.gain.value = vol
    src.buffer = buf
    src.connect(g).connect(c.destination)
    src.start()
  } catch {
    /* audio unavailable */
  }
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.1),
  correct: () => {
    tone(523, 0.12, 'triangle', 0.18)
    tone(784, 0.18, 'triangle', 0.18, undefined, 0.1)
  },
  wrong: () => tone(220, 0.35, 'sawtooth', 0.12, 110),
  hit: () => {
    noise(0.18, 0.3)
    tone(180, 0.2, 'square', 0.15, 60)
  },
  hurt: () => {
    tone(300, 0.25, 'sawtooth', 0.15, 90)
    noise(0.12, 0.15)
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, undefined, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, undefined, i * 0.15)),
  tick: () => tone(1200, 0.03, 'square', 0.05),
  flip: () => tone(420, 0.08, 'sine', 0.08, 700),
}
