import { Component, type ErrorInfo, type ReactNode } from "react"
import { reportBoundaryError } from "@/lib/sentry"
import { classifyError, type ErrorClassification } from "@/shared/utils/error-codes"
import ErrorScreen from "./error-screen"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  classification: ErrorClassification
  refId?: string
}

/**
 * Catches render errors, reports them to Sentry and shows a friendly crash screen.
 * The raw error message is never shown to players — only a known-error code and/or
 * a short Sentry reference they can pass along.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, classification: {} }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, classification: classifyError(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
    const refId = reportBoundaryError(
      error,
      info.componentStack,
      this.state.classification.code ?? classifyError(error).code,
    )
    if (refId) this.setState({ refId })
  }

  render() {
    if (this.state.hasError) {
      const { code, hint } = this.state.classification
      return (
        this.props.fallback ?? (
          <ErrorScreen
            code={code}
            hint={hint}
            refId={this.state.refId}
          />
        )
      )
    }
    return this.props.children
  }
}
