import * as Sentry from "@sentry/react"

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: typeof __BUILD_COMMIT_SHA__ !== "undefined" ? __BUILD_COMMIT_SHA__ ?? undefined : undefined,
    // Only send errors; disable session replays and performance tracing to
    // keep the bundle lean and avoid capturing any user behaviour.
    integrations: [],
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Strip user IP and breadcrumbs that could identify a session.
    beforeSend(event) {
      delete event.user
      return event
    },
  })
}

export { Sentry }
