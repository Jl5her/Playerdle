/**
 * The sync API path embeds the passphrase hash, which acts as the credential for a
 * user's synced data, plus a device ID — never let either reach Sentry.
 */
export function redactUrl(value: string): string {
  return value
    .replace(/\/api\/sync\/[^/?#\s]+(\?[^#\s]*)?/g, "/api/sync/[redacted]")
    .replace(/(^|[?&])device=[^&#\s]*/g, "$1device=[redacted]")
}

export function redactStrings<T extends Record<string, unknown>>(obj: T | undefined): void {
  if (!obj) return
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") (obj as Record<string, unknown>)[key] = redactUrl(value)
  }
}

/** Redacts sync URLs anywhere inside a JSON-serializable value (e.g. a replay event). */
export function redactDeep<T>(value: T): T {
  const json = JSON.stringify(value)
  if (!json || (!json.includes("/api/sync/") && !json.includes("device="))) return value
  return JSON.parse(redactUrl(json)) as T
}
