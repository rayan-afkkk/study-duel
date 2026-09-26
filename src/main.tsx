import './lib/domGuard'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applyTheme, getSettings } from './lib/settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import { logError } from './lib/errorLog'

applyTheme(getSettings().theme)

window.addEventListener('error', (e) => e.error && logError('window', e.error))
window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason))

const container = document.getElementById('root')!
let root: Root
let crashes: number[] = []

function tree(n: number) {
  return (
    <StrictMode key={n}>
      <BrowserRouter>
        {/* Outermost safety net: never leave a black screen — re-mount the app and keep going. */}
        <ErrorBoundary level="app">
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </StrictMode>
  )
}

/**
 * If React ever unmounts the whole app after an error it couldn't contain (e.g. the DOM was changed by a
 * browser extension mid-update), start it again on the same URL instead of showing a black screen.
 */
function mount(n = 0) {
  root = createRoot(container, {
    onUncaughtError: (error) => {
      logError('uncaught', error)
      const now = Date.now()
      crashes = [...crashes.filter((t) => now - t < 10_000), now]
      if (crashes.length > 3) return location.reload() // something is badly wrong — do a clean reload
      setTimeout(() => {
        try {
          root.unmount()
        } catch {
          /* already unmounted */
        }
        container.innerHTML = ''
        mount(n + 1)
      }, 0)
    },
  })
  root.render(tree(n))
}
mount()
