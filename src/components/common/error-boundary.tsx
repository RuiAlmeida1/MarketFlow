import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/error-state'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback renderer; defaults to a retryable error card. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Prevents a failure in a secondary dashboard section from taking down the
 * entire page. Each section can be wrapped independently.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] section crashed', error, info.componentStack)
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset)
      return (
        <ErrorState
          compact
          title="This section could not be displayed"
          message="The rest of your dashboard is still available."
          onRetry={this.reset}
        />
      )
    }
    return this.props.children
  }
}
