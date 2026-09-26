/**
 * Prompt builders for every AI task. Each returns system + user text; the document context is
 * injected separately so the runner can trim it to each provider's budget.
 */
import type { AiRequest, AiTask, Difficulty, Language, StudyMode } from '../../shared/schemas.js'

type Payload = AiRequest['payload']

export interface TaskSpec {
  vision?: boolean
  temperature: number
  /** build(payload) → system prompt + user instruction (context appended by runner) */
  build(p: Payload): { system: string; user: string }
  /** whether this task needs document context */
  usesContext: boolean
}

const TEACHER = `You are StudyDuel, a warm, brilliant teacher for school students in Pakistan (grades 6–12, Matric, O-Levels).
You explain so clearly that a 12-year-old understands. Use short sentences, everyday Pakistani examples (cricket, rickshaws, chai, load-shedding, bazaar),
and never invent facts that contradict the source material. The source text is split into pages marked like "[Page 3]"; cite page numbers from those markers.`

export function languageRule(lang: Language = 'en') {
  switch (lang) {
    case 'ur':
      return 'Write every student-facing string in Urdu script (اردو). Keep scientific terms in English in brackets the first time, e.g. قوت (Force). JSON keys stay in English.'
    case 'roman':
      return "Write every student-facing string in Roman Urdu (Urdu in English letters), e.g. 'Force aik push ya pull hoti hai'. Keep scientific terms in English. JSON keys stay in English."
    default:
      return 'Write in simple, friendly English.'
  }
}

function levelRule(d: Difficulty = 'medium', m: StudyMode = 'concept') {
  const diff = {
    easy: 'Difficulty: EASY — direct recall and simple understanding.',
    medium: 'Difficulty: MEDIUM — understanding and application.',
    hard: 'Difficulty: HARD — multi-step application, analysis, tricky distractors.',
  }[d]
  const mode =
    m === 'slo'
      ? 'Mode: SLO-based — align with Student Learning Outcomes of the Pakistani national curriculum; phrase items as "Students should be able to…" outcomes (define, explain, calculate, compare).'
      : 'Mode: Concept-based — focus on deep conceptual understanding and real-life reasoning.'
  return `${diff}\n${mode}`
}

/** Different question sets for each game so the MCQ test, boss battle, voice quiz and live battle don't repeat. */
const MCQ_STYLES: Record<string, string> = {
  test: 'Style: a balanced exam-style test covering every topic (definitions, understanding and application).',
  boss: 'Style: BOSS BATTLE — challenging APPLICATION and reasoning questions: short numericals, "what happens if…", real-life scenarios, and common misconceptions. No simple definition recall.',
  voice: 'Style: VOICE QUIZ — questions will be READ ALOUD and answered by voice. Keep each question under 20 words; options 1–4 words each; no symbols or formulas that are hard to say; never "all/none of the above".',
  battle: 'Style: LIVE BATTLE — quick-fire, fun questions answerable within 15 seconds, varied across the chapter.',
}

const avoidRule = (avoid: unknown) =>
  Array.isArray(avoid) && avoid.length
    ? `\nDo NOT repeat or rephrase any of these existing questions — ask about different facts or angles:\n${avoid
        .slice(0, 40)
        .map((q) => `- ${String(q).slice(0, 140)}`)
        .join('\n')}`
    : ''

const common = (p: Payload) => `${languageRule(p.language)}\n${levelRule(p.difficulty, p.mode)}`
const n = (v: unknown, d: number) => (typeof v === 'number' && v > 0 ? Math.min(v, 60) : d)

export const TASK_SPECS: Record<AiTask, TaskSpec> = {
  explain: {
    temperature: 0.5,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Create a complete topic-by-topic explanation of this chapter.
${common(p)}
- Cover EVERY important topic in order (usually 4–8 topics).
- "content": 2–4 short paragraphs separated by "\\n\\n". Use **bold** for key terms. Explain like to a young student, with a relatable example.
- "keyPoints": 3–5 bullet facts. "example": one real-life example. "pages": source page numbers used.
- "diagram": when a process, cycle, classification or cause→effect helps, give a small Mermaid flowchart ("flowchart TD" or "flowchart LR"), max 8 nodes, every label in double quotes like A["Label"], no parentheses or special characters outside quotes. Otherwise null.
- "chart": only when numbers are compared (e.g. speeds, masses, percentages), give {type:"bar"|"line"|"pie", title, data:[{label,value}]}. Otherwise null.`,
    }),
  },
  summary: {
    temperature: 0.4,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Write a one-page overview summary of the chapter.
${common(p)}
"overview": 1–2 paragraphs. "keyPoints": 6–10 key points each with its source page. "keyTerms": 5–10 important terms with one-line definitions.`,
    }),
  },
  flashcards: {
    temperature: 0.5,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Create ${n(p.count, 15)} high-quality flashcards from the chapter.
${common(p)}
Flashcards test RECALL, not multiple choice. Mix these kinds: key term → definition, formula → what each symbol means + unit,
"why…?" questions, "difference between X and Y", and a real-life example to identify. Cover the WHOLE chapter evenly.
"front": a clear question or term (short). "back": concise answer (1–3 sentences). "page": source page number.`,
    }),
  },
  mcqs: {
    temperature: 0.6,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Create ${n(p.count, 10)} multiple-choice questions from the chapter.
${common(p)}
${MCQ_STYLES[String(p.variant ?? 'test')] ?? MCQ_STYLES.test}
Each has exactly 4 options, "answerIndex" (0-based) of the single correct option, plausible distractors,
"explanation" explaining why the answer is right and the common mistake, "page" (source page), and "topic" (short topic name).
Vary the position of the correct answer.${avoidRule(p.avoid)}`,
    }),
  },
  guessPaper: {
    temperature: 0.6,
    usesContext: true,
    build: (p) => ({
      system: `${TEACHER}\nYou are also an experienced paper setter for Pakistani examination boards.`,
      user: `Create a guess paper for this chapter in the pattern of: ${String(p.board ?? 'Custom')}.
${common(p)}
Board patterns:
- "Sindh Board" (BSEK/BIEK Matric): Section A MCQs (1 mark each), Section B short-answer questions (choose from given, ~3–5 marks), Section C long/descriptive questions (~7–10 marks).
- "Federal Board" (FBISE SSC): Section A MCQs (1 mark each, 12–15), Section B short questions (2–4 marks), Section C detailed questions (5–8 marks).
- "O-Levels" (Cambridge): Paper-style structured questions with sub-parts and marks in brackets, plus a few MCQs.
- "Custom": ${n(p.mcqCount, 10)} MCQs, ${n(p.shortCount, 6)} short questions, ${n(p.longCount, 3)} long questions.
Give realistic marks per question, "totalMarks", "timeMinutes", general "instructions", and for MCQs include 4 "options". Use source pages in "page".`,
    }),
  },
  studyPlan: {
    temperature: 0.4,
    usesContext: true,
    build: (p) => ({
      system: `${TEACHER}\nYou are also an expert study coach.`,
      user: `Create a day-by-day study plan.
${languageRule(p.language)}
Today: ${String(p.today)}. Exam date: ${String(p.examDate)} (${String(p.daysLeft)} days left, one entry per day, include today, max 45 days).
Student's previous exam percentage: ${String(p.prevPercent)}%. Daily available time: ${String(p.dailyMinutes ?? 90)} minutes.
Weak topics (spend MORE time on these): ${JSON.stringify(p.weakTopics ?? [])}.
Chapter topics: ${JSON.stringify(p.topics ?? [])}.
Rules: spaced repetition (revisit weak topics every 2–3 days), mix StudyDuel tools in tasks (flashcards, MCQ test, explain-it-back, guess paper, boss battle), last 1–2 days are full revision + mock paper.
Each day: "date" (YYYY-MM-DD), "title", "topics", "tasks" (2–4 concrete tasks), "minutes". Add 3–5 motivating "tips".`,
    }),
  },
  mindmap: {
    temperature: 0.4,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Build a mind map of the whole chapter.
${languageRule(p.language)}
Return "nodes": one root node (parent null, the chapter name), 4–7 main branches, and 2–4 sub-nodes under each. Max 30 nodes.
Each node: "id" (short unique string), "label" (max 5 words), "parent" (id or null), "summary" (1–2 sentence explanation), "page".`,
    }),
  },
  podcast: {
    temperature: 0.8,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `Turn this chapter into a lively podcast conversation between two hosts:
- "A" = Ayesha, the curious host who asks questions and makes jokes.
- "B" = Bilal, the expert who explains clearly with vivid examples.
${languageRule(p.language)}
Write 16–24 lines, each 1–3 sentences, natural and fun, covering all key ideas and ending with a quick recap. Give it a catchy "title". "speaker" must be "A" or "B".`,
    }),
  },
  grade: {
    vision: true,
    temperature: 0.2,
    usesContext: false,
    build: (p) => ({
      system: `You are a strict but kind Pakistani board examiner. You read handwritten answers from photos and mark them exactly like a board examiner.`,
      user: `${languageRule(p.language)}
Question: ${String(p.question || '(not provided — infer it from the photo)')}
Maximum marks: ${String(p.maxMarks ?? 5)}. Board style: ${String(p.board ?? 'Matric board')}.
${p.context ? 'Reference material is included below — use it to judge correctness.' : ''}
1) "transcription": transcribe the handwriting. 2) Award "marks" out of "outOf" using board marking (key points, keywords, diagrams, presentation).
3) "feedback": examiner comment. 4) "strengths" and "improvements" (specific, e.g. "missing unit N", "define inertia first").`,
    }),
  },
  doubt: {
    temperature: 0.3,
    usesContext: true,
    build: (p) => ({
      system: TEACHER,
      user: `A student asked a doubt. Answer it using the chapter material first (you may add general knowledge if the chapter doesn't cover it, but say so).
${languageRule(p.language)}
Doubt: """${String(p.question ?? '')}"""
Give a clear "answer" (short paragraphs, **bold** key terms) and "citations": page numbers with a short supporting quote from the source.`,
    }),
  },
  explainBack: {
    temperature: 0.3,
    usesContext: true,
    build: (p) => ({
      system: `${TEACHER}\nYou are now checking a student's own explanation like a caring teacher (Feynman technique).`,
      user: `Topic: ${String(p.topic ?? '')}
Student's explanation: """${String(p.studentAnswer ?? '')}"""
${languageRule(p.language)}
Compare with the chapter. "score" 0–10, "verdict" one encouraging sentence, "correctPoints" what they got right,
"misunderstandings" [{what: the wrong/unclear idea they said, correction}], "missing" important ideas they left out, "tip" one next step.`,
    }),
  },
  ocr: {
    vision: true,
    temperature: 0,
    usesContext: false,
    build: () => ({
      system: 'You are a precise OCR engine for textbook pages.',
      user: 'Extract ALL text from the photo of a book page in reading order. Keep headings on their own lines. Describe any diagrams in one line as [Diagram: ...]. Return {"text": "..."}.',
    }),
  },
  experiment: {
    temperature: 0.4,
    usesContext: true,
    build: (p) => ({
      system: `${TEACHER}\nYou are also a creative science lab designer who builds interactive virtual experiments.`,
      user: `Design ONE interactive virtual experiment specifically for THIS chapter (not a generic one).
${languageRule(p.language)}
If the chapter has a quantitative relationship (physics, chemistry, biology rates, maths, economics…), set "applicable": true and:
- "variables": 2–4 sliders the student can change, each {id (short lowercase identifier like "mass"), label, unit, min, max, step, value}.
- "outputs": 1–3 computed results, each {id, label, unit, formula, explain}. "formula" is a JavaScript-style math expression using ONLY
  the variable ids, numbers, + - * / ^ ( ), and functions sin cos tan sqrt abs log log10 exp min max pow, constants PI and E,
  and rad(x) to convert degrees to radians. Example: "force / mass" or "max(0, (force - mu*mass*9.8) / mass)".
- "chart": {x: a variable id, y: an output id} — the relationship worth graphing.
- "steps": 3–5 guided steps ("Set mass to 2 kg, then double the force. What happens to acceleration?").
- "questions": 2–3 {q, a} thinking questions about what the student observed.
If the chapter is NOT quantitative (history, literature, languages, most social studies), set "applicable": false, leave variables/outputs empty,
and instead give "activity": 4–6 steps of a hands-on classroom/home activity or mini-investigation for this chapter.
Always give "title", "goal" (what the student will discover) and "background" (2–3 sentences).
"simulationId": if one of these built-in animations truly matches the chapter, give its id, else null: ${JSON.stringify(p.simulations ?? [])}.`,
    }),
  },
  pickSimulation: {
    temperature: 0,
    usesContext: false,
    build: (p) => ({
      system: 'You match science topics to interactive simulations.',
      user: `Available simulations: ${JSON.stringify(p.simulations ?? [])}.
Chapter topics: ${JSON.stringify(p.topics ?? [])}.
Pick the single best "simulationId" (must be one of the ids) and a one-line "reason". If nothing fits, pick the closest.`,
    }),
  },
}
