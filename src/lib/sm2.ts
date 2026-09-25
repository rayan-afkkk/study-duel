/** SM-2 spaced repetition. Buttons map to quality: Again=1, Hard=3, Easy=5. */
import type { Card } from './db'

export type Grade = 'again' | 'hard' | 'easy'
const Q: Record<Grade, number> = { again: 1, hard: 3, easy: 5 }
const DAY = 86400000

export function review(card: Card, grade: Grade, now = Date.now()): Card {
  const q = Q[grade]
  let { ease, interval, reps, lapses } = card
  if (q < 3) {
    reps = 0
    interval = 0 // relearn in this session (1 minute)
    lapses += 1
  } else {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 6
    else interval = Math.round(interval * ease)
    if (grade === 'hard') interval = Math.max(1, Math.round(interval * 0.6))
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  const due = interval === 0 ? now + 60_000 : now + interval * DAY
  return { ...card, ease, interval, reps, lapses, due, lastReviewed: now }
}

export const newCardFields = () => ({ ease: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now() })

export function nextIntervalLabel(card: Card, grade: Grade) {
  const r = review(card, grade)
  if (r.interval === 0) return '<1m'
  return r.interval === 1 ? '1d' : `${r.interval}d`
}
