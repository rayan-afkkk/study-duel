/** Deterministic offline study plan — used when the AI is unavailable. Weak topics get ~2× time. */
import type { StudyPlanData } from '@shared/schemas'
import { todayISO } from './utils'

export function localPlan(opts: { topics: string[]; weak: string[]; examDate: string; prevPercent: number; dailyMinutes: number }): StudyPlanData {
  const start = new Date()
  const end = new Date(opts.examDate + 'T00:00:00')
  const days = Math.max(1, Math.min(45, Math.round((end.getTime() - new Date(todayISO() + 'T00:00:00').getTime()) / 86400000) + 1))
  const topics = opts.topics.length ? opts.topics : ['Chapter overview']
  const weakSet = new Set(opts.weak)
  // weighted rotation: weak topics appear twice
  const rotation = topics.flatMap((t) => (weakSet.has(t) ? [t, t] : [t]))
  const tasks = [
    (t: string) => [`Read the explanation of “${t}” and listen to it with read-aloud`, `Review due flashcards`, `Explain “${t}” back in your own words`],
    (t: string) => [`Take a 10-question MCQ test on “${t}”`, `Revise your mistake notebook`, `Watch the mind map branch for “${t}”`],
    (t: string) => [`Fight the boss battle`, `Flashcards: practise all cards on “${t}”`, `Write one long answer and grade it with handwriting grading`],
  ]
  const out: StudyPlanData['days'] = []
  for (let d = 0; d < days; d++) {
    const date = new Date(start.getTime() + d * 86400000)
    const iso = todayISO(date)
    const left = days - d
    if (left <= 2 && days > 3) {
      out.push({
        date: iso,
        title: left === 1 ? 'Final revision & rest' : 'Full mock paper',
        topics: opts.weak.length ? opts.weak : topics.slice(0, 3),
        tasks: left === 1 ? ['Read the one-page summary', 'Quick flashcard review (due only)', 'Sleep early — you’ve got this!'] : ['Attempt the guess paper under timed conditions', 'Check answers and add mistakes', 'Revise weak topics'],
        minutes: opts.dailyMinutes,
      })
      continue
    }
    const t = rotation[d % rotation.length]
    const t2 = rotation[(d + 1) % rotation.length]
    out.push({
      date: iso,
      title: weakSet.has(t) ? `Focus: ${t} (weak topic)` : t,
      topics: t2 !== t ? [t, t2] : [t],
      tasks: tasks[d % tasks.length](t),
      minutes: weakSet.has(t) ? Math.round(opts.dailyMinutes * 1.25) : opts.dailyMinutes,
    })
  }
  const tips = [
    opts.prevPercent < 50 ? 'Start small: 25-minute focus sessions with 5-minute breaks work wonders.' : 'You have a strong base — push for full marks by practising long answers.',
    'Review flashcards every day, even for 5 minutes — spaced repetition beats cramming.',
    'Every wrong answer goes to your mistake notebook. Clear it before the exam!',
  ]
  return { days: out, tips }
}
