/**
 * POST /api/ai — the single entry point for every AI call in StudyDuel.
 * Body: { task: AiTask, payload: {...} } → { ok, task, provider, model, data } | { ok:false, error }
 * API keys live only in server environment variables.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runAiRequest } from './_lib/runner.js'

/** CORS so a frontend hosted elsewhere (e.g. Lovable preview) can call this function. */
function cors(req: VercelRequest, res: VercelResponse) {
  const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = String(req.headers.origin ?? '')
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : ''
  if (allow) res.setHeader('Access-Control-Allow-Origin', allow)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  const result = await runAiRequest(body)
  return res.status(result.status).json(result.body)
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
