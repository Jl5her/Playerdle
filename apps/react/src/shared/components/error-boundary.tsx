import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="app-viewport flex items-center justify-center p-8 text-center">
            <p className="text-primary-500 dark:text-primary-400 text-sm">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
