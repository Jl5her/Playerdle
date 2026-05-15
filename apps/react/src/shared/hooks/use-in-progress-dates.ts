import { useMemo } from "react"

/**
 * Scans localStorage for keys of the form `${prefix}${dateKey}` and returns
 * a map of dateKey -> guess count for any saved-but-unfinished puzzles.
 *
 * The stored value can be either a bare array of guess strings or the legacy
 * `{ dateKey, guesses | guessIds }` wrapper — both are accepted so any
 * in-flight games from before the per-date layout switch keep working.
 *
 * Pass extra reactive values in `deps` (e.g. a version counter that gets
 * bumped after a save) to force a re-scan; without them the memoized result
 * is stale until the prefix changes.
 */
export function useInProgressDates(prefix: string, deps: ReadonlyArray<unknown> = []) {
  return useMemo(() => {
    const counts = new Map<string, number>()
    if (typeof localStorage === "undefined") return counts
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(prefix)) continue
      const dateKey = k.slice(prefix.length)
      try {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const list = Array.isArray(parsed)
          ? parsed
          : (parsed?.guesses ?? parsed?.guessIds ?? [])
        if (Array.isArray(list) && list.length > 0) counts.set(dateKey, list.length)
      } catch {
        // ignore malformed entries
      }
    }
    return counts
  }, [prefix, ...deps])
}
