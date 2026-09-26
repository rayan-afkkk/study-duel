/**
 * Core of /api/ai: validates the request, builds the prompt, walks the provider/key chain with
 * fallback, parses + validates JSON with zod (one repair retry), and returns a common envelope.
 */
import { z } from 'zod'
import { SCHEMAS, TASKS, type AiRequest, type AiResponse, type AiTask } from '../../shared/schemas.js'
import { getProviders, maskKey, ProviderError, type Provider, type ProviderRequest } from './providers.js'
import { TASK_SPECS } from './tasks.js'

const MAX_CONTEXT_CHARS = 400_000

interface Attempt {
  provider: string
  key: string
  error: string
}

function schemaHint(task: AiTask): string {
  try {
    const json = z.toJSONSchema(SCHEMAS[task], { unrepresentable: 'any', io: 'input' })
    // drop noise that only costs tokens
    return JSON.stringify(json)
      .replace(/,?"(minimum|maximum)":-?9007199254740991/g, '')
      .replace(/"\$schema":"[^"]*",?/, '')
  } catch {
    return ''
  }
}

export function extractJson(text: string): unknown {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  try {
    return JSON.parse(t)
  } catch {
    // fall back to the outermost {...}
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error('Response was not valid JSON')
  }
}

/** Keep the beginning and end of very long documents so every provider fits its budget. */
function trimContext(ctx: string, budget: number) {
  if (ctx.length <= budget) return ctx
  const head = Math.floor(budget * 0.8)
  return `${ctx.slice(0, head)}\n\n[… middle of document trimmed for length …]\n\n${ctx.slice(-(budget - head))}`
}

const timeoutMs = () => Number(process.env.AI_TIMEOUT_MS) || 25_000
/** Stay inside Vercel's 60s function limit across all attempts. */
const TOTAL_BUDGET_MS = 52_000

/** Keys that recently hit a rate limit are tried last for 60s (per warm serverless instance). */
const cooldown = new Map<string, number>()
const COOLDOWN_MS = 60_000
const orderKeys = (keys: string[]) => {
  const now = Date.now()
  const hot = keys.filter((k) => (cooldown.get(k) ?? 0) <= now)
  const cold = keys.filter((k) => (cooldown.get(k) ?? 0) > now)
  return [...hot, ...cold]
}

/** Walk providers → keys until one returns text. */
async function callWithFallback(
  providers: Provider[],
  build: (p: Provider) => ProviderRequest,
  attempts: Attempt[],
  deadline = Date.now() + TOTAL_BUDGET_MS,
): Promise<{ text: string; provider: Provider }> {
  for (const provider of providers) {
    const req = build(provider)
    for (const key of orderKeys(provider.keys)) {
      const started = Date.now()
      const remaining = deadline - started
      if (remaining < 3_000) throw new Error('All AI providers failed (out of time)')
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs(), remaining))
      try {
        console.log(`[ai] → ${provider.name}/${provider.model} key ${maskKey(key)}`)
        const text = await provider.call(key, req, ctrl.signal)
        console.log(`[ai] ✓ ${provider.name} key ${maskKey(key)} in ${Date.now() - started}ms`)
        return { text, provider }
      } catch (e) {
        const err = e as Error
        const aborted = err.name === 'AbortError'
        const msg = aborted ? `timeout after ${timeoutMs()}ms` : err.message
        attempts.push({ provider: provider.name, key: maskKey(key), error: msg.slice(0, 200) })
        console.warn(`[ai] ✗ ${provider.name} key ${maskKey(key)} → ${msg.slice(0, 160)}`)
        if (e instanceof ProviderError && e.status === 429) cooldown.set(key, Date.now() + COOLDOWN_MS)
        // timeout / overloaded / model gone → another key won't help, go to the next model
        const retryable = !aborted && (!(e instanceof ProviderError) || e.retryable)
        if (!retryable) break
      } finally {
        clearTimeout(timer)
      }
    }
    console.warn(`[ai] ${provider.name}/${provider.model} exhausted, falling back`)
  }
  throw new Error('All AI providers failed')
}

export async function runAiRequest(body: unknown): Promise<{ status: number; body: AiResponse }> {
  const req = body as Partial<AiRequest>
  if (!req || typeof req.task !== 'string' || !(TASKS as readonly string[]).includes(req.task)) {
    return { status: 400, body: { ok: false, error: `Unknown task. Use one of: ${TASKS.join(', ')}` } }
  }
  const task = req.task as AiTask
  const payload = (req.payload ?? {}) as AiRequest['payload']
  const spec = TASK_SPECS[task]
  const schema = SCHEMAS[task]

  let providers = getProviders()
  if (spec.vision) providers = providers.filter((p) => p.vision)
  if (!providers.length) {
    return {
      status: 503,
      body: {
        ok: false,
        task,
        error: spec.vision
          ? 'No vision-capable AI provider configured (set GEMINI_API_KEYS).'
          : 'No AI provider configured. Add GEMINI_API_KEYS / GROQ_API_KEYS to your environment.',
      },
    }
  }

  const { system, user } = spec.build(payload)
  const context = String(payload.context ?? '').slice(0, MAX_CONTEXT_CHARS)
  const hint = schemaHint(task)
  const images = spec.vision ? (payload.images ?? []).slice(0, 4) : undefined
  const attempts: Attempt[] = []
  const started = Date.now()

  const makeBuilder =
    (repairNote = '') =>
    (p: Provider): ProviderRequest => ({
      system: `${system}\n\nReply with ONLY a JSON object (no markdown fences) that matches this JSON Schema:\n${hint}`,
      user: [
        user,
        repairNote,
        spec.usesContext && context ? `\n=== SOURCE MATERIAL ===\n${trimContext(context, p.contextBudget)}\n=== END ===` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      images,
      json: true,
      temperature: spec.temperature,
    })

  try {
    let { text, provider } = await callWithFallback(providers, makeBuilder(), attempts, started + TOTAL_BUDGET_MS)
    let parsed = validate(schema, text)
    if (!parsed.ok) {
      console.warn(`[ai] invalid JSON from ${provider.name} (${parsed.error}); retrying once`)
      ;({ text, provider } = await callWithFallback(
        providers,
        makeBuilder(
          `IMPORTANT: your previous answer was rejected (${parsed.error}). Return ONLY valid JSON that exactly matches the schema.`,
        ),
        attempts,
        started + TOTAL_BUDGET_MS,
      ))
      parsed = validate(schema, text)
      if (!parsed.ok) throw new Error(`AI returned invalid data twice: ${parsed.error}`)
    }
    return {
      status: 200,
      body: { ok: true, task, provider: provider.name, model: provider.model, data: parsed.data, ms: Date.now() - started },
    }
  } catch (e) {
    return { status: 502, body: { ok: false, task, error: (e as Error).message, attempts } }
  }
}

function validate(schema: z.ZodTypeAny, text: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const json = extractJson(text)
    const res = schema.safeParse(json)
    if (res.success) return { ok: true, data: res.data }
    return { ok: false, error: res.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
