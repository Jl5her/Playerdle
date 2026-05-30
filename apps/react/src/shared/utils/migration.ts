import {
  analyzeMerge,
  applyData,
  collectSyncData,
  resolveMerge,
  type MergeAnalysis,
} from "./sync"

const MIGRATE_HASH_PREFIX = "#migrate="

export interface MigrationConflictData {
  analysis: MergeAnalysis
}

function readMigrationData(): Record<string, string> | null {
  const hash = location.hash
  if (!hash.startsWith(MIGRATE_HASH_PREFIX)) return null
  try {
    const encoded = hash.slice(MIGRATE_HASH_PREFIX.length)
    const parsed: unknown = JSON.parse(atob(encoded))
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, string>
  } catch {
    return null
  }
}

function clearMigrationHash(): void {
  history.replaceState(null, "", location.pathname + location.search)
}

/**
 * Checks for a migration payload in the URL fragment (placed there by the old
 * domain redirect). If found: applies non-conflicting data immediately, removes
 * the fragment from the URL, and returns conflict data when user resolution is
 * needed. Returns null if no migration payload is present.
 */
export function checkAndApplyMigration(): MigrationConflictData | null {
  const remoteData = readMigrationData()
  if (!remoteData) return null

  clearMigrationHash()

  const localData = collectSyncData().data
  const analysis = analyzeMerge(localData, remoteData)

  applyData(analysis.easyMerged)

  if (!analysis.hasConflicts) return null

  return { analysis }
}

export function resolveMigrationConflict(
  analysis: MergeAnalysis,
  winner: "local" | "remote",
): void {
  applyData(resolveMerge(analysis, winner))
}
