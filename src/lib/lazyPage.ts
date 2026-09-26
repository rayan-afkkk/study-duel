import { createElement, lazy, type ComponentType } from 'react'

/**
 * After a new deploy, a tab that was already open still references the OLD hashed JS files, which no longer
 * exist — so opening the next page fails until you refresh. This retries once and, if the file is really
 * gone, reloads the page (once) to pick up the new version automatically.
 */
const RELOAD_KEY = 'sd-chunk-reload'
const loaders: (() => Promise<unknown>)[] = []

async function withRetry<T>(load: () => Promise<T>): Promise<T> {
  try {
    const mod = await load()
    try {
      sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* ignore */
    }
    return mod
  } catch (err) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      return await load()
    } catch {
      let reloaded = false
      try {
        reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
        if (!reloaded) sessionStorage.setItem(RELOAD_KEY, '1')
      } catch {
        /* ignore */
      }
      if (!reloaded) {
        window.location.reload()
        return new Promise<T>(() => {}) // keep showing the loader while the page reloads
      }
      throw err
    }
  }
}

/**
 * Like React.lazy, but once the page's code has been downloaded (e.g. by preloadPages) it renders
 * synchronously — no Suspense fallback flash when switching pages.
 */
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  let resolved: T | undefined
  const tracked = () =>
    withRetry(load).then((m) => {
      resolved = m.default
      return m
    })
  loaders.push(tracked)
  const Lazy = lazy(tracked)
  const Page = (props: any) => createElement((resolved ?? Lazy) as ComponentType<any>, props)
  return Page as unknown as T
}

/** Fetch all page bundles when the browser is idle, so later navigation doesn't wait on the network. */
export function preloadPages() {
  const run = () => loaders.forEach((l) => l().catch(() => {}))
  // (each loader records its component, so later navigation renders instantly)
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(run)
  else setTimeout(run, 1500)
}

// Vite fires this when a preloaded dependency of a page fails to load (same stale-deploy problem).
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => {
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      return
    }
    e.preventDefault()
    window.location.reload()
  })
}
