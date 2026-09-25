/** Cache-key params per task — anything that changes the AI output must be in here. */
import type { Settings } from './settings'

type S = Pick<Settings, 'language' | 'difficulty' | 'mode'>

export const P = {
  explain: (s: S) => ({ language: s.language, difficulty: s.difficulty, mode: s.mode }),
  summary: (s: S) => ({ language: s.language }),
  flashcards: (s: S) => ({ language: s.language, difficulty: s.difficulty, mode: s.mode, count: 15 }),
  mcqs: (s: S) => ({ language: s.language, difficulty: s.difficulty, mode: s.mode, count: 10 }),
  mindmap: (s: S) => ({ language: s.language }),
  podcast: (s: S) => ({ language: s.language }),
  guessPaper: (s: S, board: string, custom?: { mcqCount: number; shortCount: number; longCount: number }) => ({
    language: s.language,
    difficulty: s.difficulty,
    mode: s.mode,
    board,
    ...(board === 'Custom' ? custom : {}),
  }),
  pickSimulation: () => ({ v: 1 }),
}

export const DEFAULT_SETTINGS: S = { language: 'en', difficulty: 'medium', mode: 'concept' }
