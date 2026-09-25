/**
 * AI provider adapters. Every adapter takes a normalized request and returns raw text.
 * Keys are read from env at call time (comma-separated lists) and never leave the server.
 */
import type { AiImage } from '../../shared/schemas.js'

export interface ProviderRequest {
  system: string
  user: string
  images?: AiImage[]
  json: boolean
  temperature: number
}

export interface Provider {
  name: string
  model: string
  keys: string[]
  vision: boolean
  /** Max characters of document context this provider should receive. */
  contextBudget: number
  call(key: string, req: ProviderRequest, signal: AbortSignal): Promise<string>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    /** true → try the next key / provider */
    public retryable: boolean,
  ) {
    super(message)
  }
}

export const splitKeys = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

export const maskKey = (k: string) => `…${k.slice(-4)}`

function classify(status: number, body: string): ProviderError {
  const quota = /quota|rate.?limit|resource.?exhausted|exceeded/i.test(body)
  const retryable = status === 429 || status >= 500 || status === 401 || status === 403 || quota
  return new ProviderError(`HTTP ${status}: ${body.slice(0, 240)}`, status, retryable)
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  const text = await res.text()
  if (!res.ok) throw classify(res.status, text)
  try {
    return JSON.parse(text)
  } catch {
    throw new ProviderError('Provider returned non-JSON envelope', 502, true)
  }
}

function gemini(): Provider {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  return {
    name: 'gemini',
    model,
    keys: splitKeys(process.env.GEMINI_API_KEYS),
    vision: true,
    contextBudget: 120_000,
    async call(key, req, signal) {
      const parts: unknown[] = [{ text: req.user }]
      for (const img of req.images ?? []) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': key },
        {
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: req.temperature,
            ...(req.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
        signal,
      )
      const text: string | undefined = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
      if (!text) {
        const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'empty response'
        throw new ProviderError(`Gemini returned no text (${reason})`, 502, true)
      }
      return text
    },
  }
}

function openAiCompatible(opts: {
  name: string
  baseUrl: string
  model: string
  keys: string[]
  jsonMode: boolean
  contextBudget: number
}): Provider {
  return {
    name: opts.name,
    model: opts.model,
    keys: opts.keys,
    vision: false,
    contextBudget: opts.contextBudget,
    async call(key, req, signal) {
      const data = await postJson(
        `${opts.baseUrl.replace(/\/$/, '')}/chat/completions`,
        { authorization: `Bearer ${key}` },
        {
          model: opts.model,
          temperature: req.temperature,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
          ...(req.json && opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        },
        signal,
      )
      const text: string | undefined = data?.choices?.[0]?.message?.content
      if (!text) throw new ProviderError(`${opts.name} returned no text`, 502, true)
      return text
    },
  }
}

/** Providers in fallback order: Gemini → Groq → optional extra OpenAI-compatible provider. */
export function getProviders(): Provider[] {
  const list: Provider[] = [
    gemini(),
    openAiCompatible({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      keys: splitKeys(process.env.GROQ_API_KEYS),
      jsonMode: true,
      contextBudget: 24_000,
    }),
  ]
  if (process.env.EXTRA_PROVIDER_BASE_URL) {
    list.push(
      openAiCompatible({
        name: 'extra',
        baseUrl: process.env.EXTRA_PROVIDER_BASE_URL,
        model: process.env.EXTRA_PROVIDER_MODEL || 'auto',
        keys: splitKeys(process.env.EXTRA_PROVIDER_API_KEYS),
        jsonMode: process.env.EXTRA_PROVIDER_JSON_MODE !== 'false',
        contextBudget: 24_000,
      }),
    )
  }
  return list.filter((p) => p.keys.length > 0)
}
