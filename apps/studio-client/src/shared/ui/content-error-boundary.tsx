import { Component, type ReactNode } from 'react'

/** Keep an independently rendered surface from replacing the application shell. */
export class ContentErrorBoundary extends Component<{
  children: ReactNode
  fallback: ReactNode | ((error: Error) => ReactNode)
  resetKey?: unknown
}, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidUpdate(previous: Readonly<typeof this.props>) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: undefined })
  }

  render() {
    if (!this.state.error) return this.props.children
    return typeof this.props.fallback === 'function' ? this.props.fallback(this.state.error) : this.props.fallback
  }
}
