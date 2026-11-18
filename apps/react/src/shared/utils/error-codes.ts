// User-facing codes for errors we know the cause of. The error screen shows the code
// (never the raw message), and the same code is tagged on the Sentry event as
// `error_code`, so a code a player reports can be searched in Sentry.

export const ERROR_CODES = {
  /** Today's answer pool is empty (e.g. a data sync wrote an empty answer_pool.json) */
  EMPTY_POOL: "E101",
  /** A code chunk failed to load — usually a stale app after a deploy, or offline */
  CHUNK_LOAD: "E201",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** An error with a known cause. Throw this instead of Error so the error screen can show a code. */
export class KnownError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = "KnownError"
    this.code = code
  }
}

export interface ErrorClassification {
  code?: ErrorCode
  /** Player-facing advice for this error, when there's something better than "refresh" */
  hint?: string
}

const HINTS: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.EMPTY_POOL]: "Today's roster didn't make it to the stadium. We're on it.",
  [ERROR_CODES.CHUNK_LOAD]:
    "A new version may have just shipped, or your connection dropped. Refreshing usually fixes it.",
}

// Browser messages for failed dynamic imports (Chrome, Safari, Firefox, webpack-style)
const CHUNK_LOAD_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed/i

export function classifyError(error: unknown): ErrorClassification {
  let code: ErrorCode | undefined
  if (error instanceof KnownError) {
    code = error.code
  } else if (error instanceof Error && CHUNK_LOAD_PATTERN.test(error.message)) {
    code = ERROR_CODES.CHUNK_LOAD
  }
  return code ? { code, hint: HINTS[code] } : {}
}
