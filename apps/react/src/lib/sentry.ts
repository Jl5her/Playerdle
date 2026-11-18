import * as Sentry from "@sentry/react"
import { useEffect } from "react"
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom"
import { redactStrings, redactUrl } from "./sentry-redact"

function sampleRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback
  const rate = Number(raw)
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : fallback
}

// Sample everything locally so traces/replays are easy to inspect; sample production
const DEV_OR = (prod: number) => (import.meta.env.DEV ? 1 : prod)

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
      // Send console.warn/error to Sentry Logs
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
      Sentry.breadcrumbsIntegration({
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],
    tracesSampleRate: sampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, DEV_OR(0.1)),
    // Session Replay (integration is lazy-loaded below to keep it out of the main bundle)
    replaysSessionSampleRate: sampleRate(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      DEV_OR(0.1),
    ),
    replaysOnErrorSampleRate: 1,
    maxBreadcrumbs: 100,
    beforeBreadcrumb(breadcrumb) {
      redactStrings(breadcrumb.data)
      if (breadcrumb.message) breadcrumb.message = redactUrl(breadcrumb.message)
      return breadcrumb
    },
    beforeSendLog(log) {
      if (typeof log.message === "string") log.message = redactUrl(log.message)
      redactStrings(log.attributes)
      return log
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

  void import("./sentry-replay")
    .then(({ createReplayIntegration }) => Sentry.addIntegration(createReplayIntegration()))
    .catch(() => {})
}

/** Sends a structured warning to Sentry Logs (no-op when Sentry isn't initialized). */
export function logWarning(message: string, attributes?: Record<string, unknown>) {
  Sentry.logger.warn(message, attributes)
}

/** Drop-in replacement for react-router's <Routes> that names transactions by route. */
export const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes)

/** Records an app-level event (e.g. a guess) in the breadcrumb trail of future errors. */
export function addGameBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category: "game", message, data, level: "info" })
}

/** Increments a Sentry counter metric (no-op when Sentry isn't initialized). */
export function countMetric(name: string, attributes?: Record<string, string | number | boolean>) {
  Sentry.metrics.count(name, 1, { attributes })
}

/** Records a value in a Sentry distribution metric (no-op when Sentry isn't initialized). */
export function distributionMetric(
  name: string,
  value: number,
  unit?: "second",
  attributes?: Record<string, string | number | boolean>,
) {
  Sentry.metrics.distribution(name, value, { unit, attributes })
}

/**
 * Reports an error caught by our ErrorBoundary and returns a short reference to show the
 * player (undefined when Sentry isn't initialized). The reference is tagged as `error_ref`
 * and any known-error code as `error_code`, so both can be searched in Sentry.
 */
export function reportBoundaryError(
  error: unknown,
  componentStack: string | null | undefined,
  errorCode?: string,
): string | undefined {
  if (!Sentry.getClient()) return undefined
  const eventId = crypto.randomUUID().replace(/-/g, "")
  const ref = eventId.slice(0, 8)
  Sentry.captureReactException(
    error,
    { componentStack: componentStack ?? "" },
    {
      event_id: eventId,
      captureContext: { tags: { error_ref: ref, ...(errorCode ? { error_code: errorCode } : {}) } },
    },
  )
  return ref
}

/**
 * Hooks for React 19's createRoot so uncaught/recoverable render errors are reported.
 * Boundary-caught errors are reported by ErrorBoundary itself (reportBoundaryError) so
 * the event carries the reference shown on the error screen.
 */
export const sentryRootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}
