/** Tiny persisted settings store (theme, study language, difficulty, mode). */
import { useSyncExternalStore } from 'react'
import type { Difficulty, Language, StudyMode } from '@shared/schemas'

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemePref
  language: Language
  difficulty: Difficulty
  mode: StudyMode
  speechRate: number
  localName: string
}

const DEFAULTS: Settings = {
  theme: 'dark',
  language: 'en',
  difficulty: 'medium',
  mode: 'concept',
  speechRate: 1,
  localName: 'Student',
}

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem('sd-settings') || '{}')
    const theme = (localStorage.getItem('sd-theme') as ThemePref) || DEFAULTS.theme
    return { ...DEFAULTS, ...raw, theme }
  } catch {
    return DEFAULTS
  }
}

let state = load()
const listeners = new Set<() => void>()

export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f6f1e8')
}

export function setSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch }
  try {
    const { theme, ...rest } = state
    localStorage.setItem('sd-settings', JSON.stringify(rest))
    localStorage.setItem('sd-theme', theme)
  } catch {
    /* storage unavailable */
  }
  if (patch.theme) applyTheme(patch.theme)
  listeners.forEach((l) => l())
}

export const getSettings = () => state

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

if (typeof window !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'system') applyTheme('system')
  })
}
