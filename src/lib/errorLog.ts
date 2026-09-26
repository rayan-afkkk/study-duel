/** Keeps the last few crashes in localStorage so they can be shown on the Account page (for debugging on real devices). */
export interface LoggedError {
  at: number
  where: string
  message: string
  stack?: string
  path: string
}

const KEY = 'sd-errors'

export function logError(where: string, err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err))
  const entry: LoggedError = {
    at: Date.now(),
    where,
    message: e.message.slice(0, 500),
    stack: e.stack?.split('\n').slice(0, 6).join('\n'),
    path: typeof location !== 'undefined' ? location.pathname : '',
  }
  console.error(`[studyduel:${where}]`, e)
  try {
    const list: LoggedError[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    localStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, 5)))
  } catch {
    /* storage unavailable */
  }
}

export function getErrors(): LoggedError[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function clearErrors() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
