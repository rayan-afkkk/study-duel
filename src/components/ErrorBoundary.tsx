import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorCard } from './AsyncState'
import { logError } from '@/lib/errorLog'

interface Props {
  children: ReactNode
  /** When this value changes (e.g. the URL), a crashed boundary resets and renders its children again. */
  resetKey?: string
  /** 'app' = outermost safety net: silently re-mounts the app once instead of leaving a black screen. */
  level?: 'page' | 'app'
}

interface State {
  error?: Error
  mountKey: number
  crashes: number[]
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { mountKey: 0, crashes: [] }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(this.props.level ?? 'page', Object.assign(error, { stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}` }))
    if (this.props.level === 'app') {
      const now = Date.now()
      const crashes = [...this.state.crashes.filter((t) => now - t < 10_000), now]
      // Recover on our own (re-mount the app) up to 3 times in 10s; only then show the error screen.
      this.setState({ crashes })
      if (crashes.length <= 3) setTimeout(() => this.setState((s) => ({ error: undefined, mountKey: s.mountKey + 1 })), 250)
    }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: undefined })
  }

  render() {
    const { error, mountKey } = this.state
    if (error) {
      if (this.props.level === 'app' && this.state.crashes.length <= 3) return null // recovering in a moment
      if (this.props.level === 'app')
        return (
          <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md">
              <ErrorCard
                error={`StudyDuel hit a problem: ${error.message}`}
                onRetry={() => this.setState((s) => ({ error: undefined, mountKey: s.mountKey + 1 }))}
                extra={
                  <button className="text-sm text-muted-foreground underline" onClick={() => location.assign('/app')}>
                    Go home
                  </button>
                }
              />
            </div>
          </div>
        )
      return (
        <div className="mx-auto max-w-xl p-8">
          <ErrorCard error={`Something broke on this page: ${error.message}`} onRetry={() => this.setState({ error: undefined })} />
        </div>
      )
    }
    return <div key={mountKey} className="contents">{this.props.children}</div>
  }
}
