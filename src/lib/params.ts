/** Cache-key params per task — anything that changes the AI output must be in here. */
import type { Settings } from './settings'

type S = Pick<Settings, 'language' | 'difficulty' | 'mode'>
export type McqVariant = 'test' | 'boss' | 'voice' | 'battle'

export const P = {
  explain: (s: S) => ({ language: s.language, difficulty: s.difficulty, mode: s.mode }),
  summary: (s: S) => ({ language: s.language }),
  flashcards: (s: S) => ({ language: s.language, difficulty: s.difficulty, mode: s.mode, count: 15 }),
  /** 'test' keeps the original key (so existing caches stay valid); other games get their own question sets. */
  mcqs: (s: S, variant: McqVariant = 'test') => ({
    language: s.language,
    difficulty: s.difficulty,
    mode: s.mode,
    count: variant === 'voice' ? 8 : 10,
    ...(variant === 'test' ? {} : { variant }),
  }),
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
  experiment: (s: S) => ({ language: s.language, v: 1 }),
}

export const DEFAULT_SETTINGS: S = { language: 'en', difficulty: 'medium', mode: 'concept' }
