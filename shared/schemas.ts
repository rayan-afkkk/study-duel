/**
 * Zod schemas shared by the /api/ai serverless function (validation) and the frontend (types).
 * Every AI task that returns structured data has a schema here.
 */
import { z } from 'zod'

const page = z.coerce.number().int().nullish()
const str = z.string()
const strList = z.array(z.string()).default([])

export const TASKS = [
  'explain',
  'summary',
  'flashcards',
  'mcqs',
  'guessPaper',
  'studyPlan',
  'mindmap',
  'podcast',
  'grade',
  'doubt',
  'explainBack',
  'ocr',
  'pickSimulation',
  'experiment',
] as const
export type AiTask = (typeof TASKS)[number]

export const ExplainSchema = z.object({
  topics: z
    .array(
      z.object({
        title: str,
        content: str,
        keyPoints: strList,
        example: z.string().nullish(),
        pages: z.array(z.coerce.number()).default([]),
        diagram: z.string().nullish(),
        chart: z
          .object({
            type: z.string().default('bar'),
            title: z.string().default(''),
            data: z.array(z.object({ label: z.string(), value: z.coerce.number() })).default([]),
          })
          .nullish(),
      }),
    )
    .min(1),
})

export const SummarySchema = z.object({
  title: str,
  overview: str,
  keyPoints: z.array(z.object({ point: str, page })).default([]),
  keyTerms: z.array(z.object({ term: str, definition: str })).default([]),
})

export const FlashcardsSchema = z.object({
  cards: z.array(z.object({ front: str, back: str, page })).min(1),
})

export const McqsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: str,
        options: z.array(z.string()).min(2),
        answerIndex: z.coerce.number().int(),
        explanation: str,
        page,
        topic: z.string().nullish(),
      }),
    )
    .min(1),
})

export const GuessPaperSchema = z.object({
  title: str,
  board: str,
  totalMarks: z.coerce.number(),
  timeMinutes: z.coerce.number(),
  instructions: strList,
  sections: z
    .array(
      z.object({
        name: str,
        instructions: z.string().default(''),
        questions: z.array(
          z.object({ question: str, marks: z.coerce.number(), options: z.array(z.string()).nullish(), page }),
        ),
      }),
    )
    .min(1),
})

export const StudyPlanSchema = z.object({
  days: z
    .array(
      z.object({
        date: str,
        title: str,
        topics: strList,
        tasks: strList,
        minutes: z.coerce.number().default(60),
      }),
    )
    .min(1),
  tips: strList,
})

export const MindmapSchema = z.object({
  nodes: z
    .array(z.object({ id: z.coerce.string(), label: str, parent: z.coerce.string().nullish(), summary: z.string().default(''), page }))
    .min(2),
})

export const PodcastSchema = z.object({
  title: str,
  lines: z.array(z.object({ speaker: z.string(), text: str })).min(2),
})

export const GradeSchema = z.object({
  transcription: z.string().default(''),
  marks: z.coerce.number(),
  outOf: z.coerce.number(),
  feedback: str,
  strengths: strList,
  improvements: strList,
})

export const DoubtSchema = z.object({
  answer: str,
  citations: z.array(z.object({ page: z.coerce.number(), quote: z.string().default('') })).default([]),
})

export const ExplainBackSchema = z.object({
  score: z.coerce.number(),
  verdict: str,
  correctPoints: strList,
  misunderstandings: z.array(z.object({ what: str, correction: str })).default([]),
  missing: strList,
  tip: z.string().default(''),
})

export const OcrSchema = z.object({ text: str })

export const ExperimentSchema = z.object({
  applicable: z.boolean().default(true),
  title: str,
  goal: z.string().default(''),
  background: z.string().default(''),
  variables: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        unit: z.string().nullish(),
        min: z.coerce.number(),
        max: z.coerce.number(),
        step: z.coerce.number().nullish(),
        value: z.coerce.number().nullish(),
      }),
    )
    .default([]),
  outputs: z
    .array(z.object({ id: z.string(), label: z.string(), unit: z.string().nullish(), formula: z.string(), explain: z.string().nullish() }))
    .default([]),
  chart: z.object({ x: z.string(), y: z.string() }).nullish(),
  steps: strList,
  questions: z.array(z.object({ q: str, a: str })).default([]),
  activity: strList,
  simulationId: z.string().nullish(),
  /** animated scene driven by one output: bubbles | particles | fill | growth | thermometer | meter */
  visual: z.object({ type: z.string(), output: z.string(), max: z.coerce.number().nullish(), label: z.string().nullish() }).nullish(),
})

export const PickSimulationSchema = z.object({ simulationId: str, reason: z.string().default('') })

export const SCHEMAS = {
  explain: ExplainSchema,
  summary: SummarySchema,
  flashcards: FlashcardsSchema,
  mcqs: McqsSchema,
  guessPaper: GuessPaperSchema,
  studyPlan: StudyPlanSchema,
  mindmap: MindmapSchema,
  podcast: PodcastSchema,
  grade: GradeSchema,
  doubt: DoubtSchema,
  explainBack: ExplainBackSchema,
  ocr: OcrSchema,
  pickSimulation: PickSimulationSchema,
  experiment: ExperimentSchema,
} satisfies Record<AiTask, z.ZodTypeAny>

export type ExplainData = z.infer<typeof ExplainSchema>
export type Topic = ExplainData['topics'][number]
export type SummaryData = z.infer<typeof SummarySchema>
export type FlashcardsData = z.infer<typeof FlashcardsSchema>
export type McqsData = z.infer<typeof McqsSchema>
export type Mcq = McqsData['questions'][number]
export type GuessPaperData = z.infer<typeof GuessPaperSchema>
export type StudyPlanData = z.infer<typeof StudyPlanSchema>
export type MindmapData = z.infer<typeof MindmapSchema>
export type PodcastData = z.infer<typeof PodcastSchema>
export type GradeData = z.infer<typeof GradeSchema>
export type DoubtData = z.infer<typeof DoubtSchema>
export type ExplainBackData = z.infer<typeof ExplainBackSchema>
export type OcrData = z.infer<typeof OcrSchema>
export type PickSimulationData = z.infer<typeof PickSimulationSchema>
export type ExperimentData = z.infer<typeof ExperimentSchema>

export interface TaskDataMap {
  explain: ExplainData
  summary: SummaryData
  flashcards: FlashcardsData
  mcqs: McqsData
  guessPaper: GuessPaperData
  studyPlan: StudyPlanData
  mindmap: MindmapData
  podcast: PodcastData
  grade: GradeData
  doubt: DoubtData
  explainBack: ExplainBackData
  ocr: OcrData
  pickSimulation: PickSimulationData
  experiment: ExperimentData
}

export type Language = 'en' | 'ur' | 'roman'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type StudyMode = 'concept' | 'slo'

export interface AiImage {
  mimeType: string
  data: string // base64 without data: prefix
}

/** Request body for POST /api/ai */
export interface AiRequest {
  task: AiTask
  payload: {
    context?: string
    language?: Language
    difficulty?: Difficulty
    mode?: StudyMode
    images?: AiImage[]
    [key: string]: unknown
  }
}

/** Common response envelope from POST /api/ai */
export type AiResponse<T = unknown> =
  | { ok: true; task: AiTask; provider: string; model: string; data: T; ms: number }
  | { ok: false; task?: AiTask; error: string; attempts?: { provider: string; key: string; error: string }[] }
