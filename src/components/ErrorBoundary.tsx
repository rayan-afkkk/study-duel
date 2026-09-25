import { Component, type ReactNode } from 'react'
import { ErrorCard } from './AsyncState'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return (
        <div className="mx-auto max-w-xl p-8">
          <ErrorCard error={`Something broke on this page: ${this.state.error.message}`} onRetry={() => location.reload()} />
        </div>
      )
    return this.props.children
  }
}
