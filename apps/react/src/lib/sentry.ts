import * as Sentry from "@sentry/react"
import { useEffect } from "react"
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom"

// Trace everything locally so traces are easy to inspect; sample production
const DEFAULT_TRACES_SAMPLE_RATE = import.meta.env.DEV ? 1 : 0.1

function tracesSampleRate(): number {
  const raw = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
  if (raw === undefined || raw === "") return DEFAULT_TRACES_SAMPLE_RATE
  const rate = Number(raw)
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_TRACES_SAMPLE_RATE
}

/**
 * The sync API path embeds the passphrase hash, which acts as the credential for a
 * user's synced data, plus a device ID — never let either reach Sentry.
 */
function redactUrl(value: string): string {
  return value
    .replace(/\/api\/sync\/[^/?#\s]+(\?[^#\s]*)?/g, "/api/sync/[redacted]")
    .replace(/(^|[?&])device=[^&#\s]*/g, "$1device=[redacted]")
}

function redactStrings<T extends Record<string, unknown>>(obj: T | undefined): void {
  if (!obj) return
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") (obj as Record<string, unknown>)[key] = redactUrl(value)
  }
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: __BUILD_COMMIT_SHA__ ?? undefined,
    integrations: [
      // Page loads + navigations, named by route pattern (e.g. /:sport/daily)
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Console breadcrumbs come from the default consoleIntegration
      Sentry.breadcrumbsIntegration({
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],
    tracesSampleRate: tracesSampleRate(),
    maxBreadcrumbs: 100,
    beforeBreadcrumb(breadcrumb) {
      redactStrings(breadcrumb.data)
      if (breadcrumb.message) breadcrumb.message = redactUrl(breadcrumb.message)
      return breadcrumb
    },
    beforeSendSpan(span) {
      span.name = redactUrl(span.name)
      redactStrings(span.attributes)
      return span
    },
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

/** Drop-in replacement for react-router's <Routes> that names transactions by route. */
export const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes)

/** Records an app-level event (e.g. a guess) in the breadcrumb trail of future errors. */
export function addGameBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category: "game", message, data, level: "info" })
}

/** Hooks for React 19's createRoot so uncaught/recoverable render errors are reported. */
export const sentryRootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}
