import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main className="min-h-dvh w-full overflow-y-auto bg-primary-50 px-4 py-8 text-center text-primary-900 dark:bg-primary-900 dark:text-primary-50">
            <section
              aria-labelledby="error-title"
              className="mx-auto flex min-h-[50dvh] w-full max-w-lg flex-col items-center justify-center gap-4"
              role="alert"
            >
              <h1
                className="text-lg font-semibold"
                id="error-title"
              >
                Something went wrong
              </h1>
              <p className="text-sm text-primary-600 dark:text-primary-200">
                Please refresh the page to try again.
              </p>
              {this.state.error?.message && (
                <pre className="max-h-40 w-full overflow-auto whitespace-pre-wrap break-words rounded bg-primary-100 p-3 text-left text-xs text-primary-800 dark:bg-primary-800 dark:text-primary-100">
                  {this.state.error.message}
                </pre>
              )}
              <button
                className="rounded bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:bg-primary-200 dark:text-primary-900 dark:hover:bg-primary-100"
                onClick={() => window.location.reload()}
                type="button"
              >
                Refresh page
              </button>
            </section>
          </main>
        )
      )
    }
    return this.props.children
  }
}
