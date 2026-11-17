import * as Sentry from "@sentry/react"

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: __BUILD_COMMIT_SHA__ ?? undefined,
    // Errors only — no performance tracing or session replay.
    tracesSampleRate: 0,
    ignoreErrors: [
      // Benign browser noise
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Stale chunk after a deploy; the PWA update flow reloads the app
      /Failed to fetch dynamically imported module/,
      /Importing a module script failed/,
    ],
  })
}

/** Hooks for React 19's createRoot so uncaught/recoverable render errors are reported. */
export const sentryRootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}
