import { WORDLIST } from "./wordlist"

const PASSPHRASE_KEY = "playerdle-sync-passphrase"
const LAST_SYNCED_KEY = "playerdle-sync-last-synced"
const DEVICE_ID_KEY = "playerdle-sync-device-id"

export const SYNC_TTL_DAYS = 7
const PASSPHRASE_WORD_COUNT = 4

const SYNC_KEY_PREFIXES = [
  "playerdle-stats:",
  "playerdle-state:",
  "playerdle-tutorial-seen-v2:",
  "playerdle-journey-played-day:",
  "playerdle-journey-history:",
  "playerdle-journey-state:",
  "journey-tutorial-seen:",
  "playerdle-colors-state:",
  "playerdle-colors-collegiate-state:",
  "playerdle-colors-history:",
  "playerdle-colors-collegiate-history:",
  "playerdle-colors-played-day",
  "playerdle-colors-collegiate-played-day",
  "statehue-tutorial-seen",
  "statehue-collegiate-tutorial-seen",
]

export interface SyncPayload {
  version: 1
  lastUpdated: string
  data: Record<string, string>
}

interface ServerGetResponse {
  payload: SyncPayload
  devices: number
}

interface ServerWriteResponse {
  devices: number
}

export function generatePassphrase(): string {
  const words: string[] = []
  // Rejection threshold removes modulo bias for non-power-of-2 list sizes.
  // Rejection rate for 125 entries is ~1e-8, so the loop almost never iterates twice.
  const limit = Math.floor(0x100000000 / WORDLIST.length) * WORDLIST.length
  while (words.length < PASSPHRASE_WORD_COUNT) {
    const buf = new Uint32Array(PASSPHRASE_WORD_COUNT)
    crypto.getRandomValues(buf)
    for (const val of buf) {
      if (words.length >= PASSPHRASE_WORD_COUNT) break
      if (val < limit) words.push(WORDLIST[val % WORDLIST.length])
    }
  }
  return words.join("-")
}

function newDeviceId(): string {
  // Cloudflare KV-friendly opaque id; URL-safe base64 of 16 random bytes.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing
    const fresh = newDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, fresh)
    return fresh
  } catch {
    return newDeviceId()
  }
}

export function getPassphrase(): string | null {
  try {
    return localStorage.getItem(PASSPHRASE_KEY)
  } catch {
    return null
  }
}

export function createPassphrase(): string {
  const phrase = generatePassphrase()
  try {
    localStorage.setItem(PASSPHRASE_KEY, phrase)
  } catch {
    // ignore storage errors
  }
  return phrase
}

export function setPassphrase(phrase: string): void {
  localStorage.setItem(PASSPHRASE_KEY, phrase)
}

export function clearPassphrase(): void {
  localStorage.removeItem(PASSPHRASE_KEY)
  localStorage.removeItem(LAST_SYNCED_KEY)
}

export function getLastSynced(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_SYNCED_KEY)
    if (!raw) return null
    const ts = parseInt(raw, 10)
    if (Number.isNaN(ts)) return null
    return new Date(ts)
  } catch {
    return null
  }
}

function storeLastSynced(): void {
  try {
    localStorage.setItem(LAST_SYNCED_KEY, String(Date.now()))
  } catch {
    // ignore storage errors
  }
}

export async function hashPassphrase(phrase: string): Promise<string> {
  const data = new TextEncoder().encode(phrase.toLowerCase().trim())
  const buffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

export function normalizePassphrase(input: string): string | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "-")
  const parts = normalized.split("-")
  if (parts.length !== PASSPHRASE_WORD_COUNT) return null
  if (!parts.every(p => WORDLIST.includes(p))) return null
  return normalized
}

export function collectSyncData(): SyncPayload {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      const value = localStorage.getItem(key)
      if (value !== null) data[key] = value
    }
  }
  return { version: 1, lastUpdated: new Date().toISOString(), data }
}

export function restoreSyncData(payload: SyncPayload): void {
  for (const [key, value] of Object.entries(payload.data)) {
    if (SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      localStorage.setItem(key, value)
    }
  }
}

/** Write a merged data map into localStorage (only touches sync-prefixed keys). */
export function applyData(data: Record<string, string>): void {
  for (const [key, value] of Object.entries(data)) {
    if (SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      try {
        localStorage.setItem(key, value)
      } catch {
        // ignore storage errors
      }
    }
  }
}

export interface MergeConflict {
  key: string
  label: string
}

export interface MergeAnalysis {
  /** Data after applying best-effort (non-conflicting) merges. */
  easyMerged: Record<string, string>
  /** In-progress-on-both-sides keys that need user resolution. */
  conflicts: MergeConflict[]
  /** Local values for each conflicted key. */
  conflictLocal: Record<string, string>
  /** Remote values for each conflicted key. */
  conflictRemote: Record<string, string>
  hasConflicts: boolean
}

function completedDatesSet(statsJson: string | undefined): Set<string> {
  if (!statsJson) return new Set()
  try {
    const arr = JSON.parse(statsJson) as Array<{ date: string }>
    return new Set(arr.map(r => r.date))
  } catch {
    return new Set()
  }
}

function mergeStatsArrays(
  localJson: string | undefined,
  remoteJson: string | undefined,
): string {
  try {
    const local: Array<{ date: string }> = localJson ? JSON.parse(localJson) : []
    const remote: Array<{ date: string }> = remoteJson ? JSON.parse(remoteJson) : []
    const byDate = new Map<string, { date: string }>()
    for (const r of local) byDate.set(r.date, r)
    // Remote fills in dates not present locally; if both have a date, keep local.
    for (const r of remote) {
      if (!byDate.has(r.date)) byDate.set(r.date, r)
    }
    return JSON.stringify([...byDate.values()])
  } catch {
    return localJson ?? remoteJson ?? "[]"
  }
}

function hasGuesses(json: string | undefined): boolean {
  if (!json) return false
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) && arr.length > 0
  } catch {
    return false
  }
}

function mergeStateKey(
  key: string,
  label: string,
  localState: string | undefined,
  remoteState: string | undefined,
  localCompleted: boolean,
  remoteCompleted: boolean,
  easyMerged: Record<string, string>,
  conflicts: MergeConflict[],
  conflictLocal: Record<string, string>,
  conflictRemote: Record<string, string>,
) {
  const localInProgress = hasGuesses(localState) && !localCompleted
  const remoteInProgress = hasGuesses(remoteState) && !remoteCompleted

  if (localInProgress && remoteInProgress && localState !== remoteState) {
    conflicts.push({ key, label })
    conflictLocal[key] = localState!
    conflictRemote[key] = remoteState!
  } else if (localCompleted && localState != null) {
    easyMerged[key] = localState
  } else if (remoteCompleted && remoteState != null) {
    easyMerged[key] = remoteState
  } else {
    const value = localState ?? remoteState
    if (value != null) easyMerged[key] = value
  }
}

/**
 * Analyzes two sync data snapshots and produces:
 * - `easyMerged`: best-effort merge of all non-conflicting data
 * - `conflicts`: keys where both sides have an in-progress (unfinished) game
 *
 * Easy merges:
 * - Stats/history arrays: union by date (local wins ties)
 * - State keys: completed side wins; if neither completed, whichever has guesses wins
 * - Tutorial-seen: true if either side is true
 * - Journey played-day: whichever date is more recent
 */
export function analyzeMerge(
  localData: Record<string, string>,
  remoteData: Record<string, string>,
): MergeAnalysis {
  const easyMerged: Record<string, string> = {}
  const conflicts: MergeConflict[] = []
  const conflictLocal: Record<string, string> = {}
  const conflictRemote: Record<string, string> = {}

  const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)])

  // Pass 1: merge completed-game history arrays (stats + journey + statehue history)
  for (const key of allKeys) {
    if (
      key.startsWith("playerdle-stats:") ||
      key.startsWith("playerdle-journey-history:") ||
      key.startsWith("playerdle-colors-history:") ||
      key.startsWith("playerdle-colors-collegiate-history:")
    ) {
      easyMerged[key] = mergeStatsArrays(localData[key], remoteData[key])
    }
  }

  // Pass 2: per-date in-progress state keys
  for (const key of allKeys) {
    if (key.startsWith("playerdle-state:")) {
      // playerdle-state:<sportId>:<variantId>:<dateKey>
      const parts = key.split(":")
      const sportId = parts[1]
      const variantId = parts[2]
      const dateKey = parts[3]
      if (!sportId || !variantId || !dateKey) {
        easyMerged[key] = localData[key] ?? remoteData[key]
        continue
      }
      const statsKey = `playerdle-stats:${sportId}:${variantId}`
      mergeStateKey(
        key,
        `${sportId.toUpperCase()} puzzle (${dateKey})`,
        localData[key],
        remoteData[key],
        completedDatesSet(localData[statsKey]).has(dateKey),
        completedDatesSet(remoteData[statsKey]).has(dateKey),
        easyMerged,
        conflicts,
        conflictLocal,
        conflictRemote,
      )
    } else if (key.startsWith("playerdle-journey-state:")) {
      // playerdle-journey-state:v1:<league>:<dateKey>
      const parts = key.split(":")
      const league = parts[2]
      const dateKey = parts[3]
      if (!league || !dateKey) {
        easyMerged[key] = localData[key] ?? remoteData[key]
        continue
      }
      const historyKey = `playerdle-journey-history:v1:${league}`
      mergeStateKey(
        key,
        `Journey ${league.toUpperCase()} puzzle (${dateKey})`,
        localData[key],
        remoteData[key],
        completedDatesSet(localData[historyKey]).has(dateKey),
        completedDatesSet(remoteData[historyKey]).has(dateKey),
        easyMerged,
        conflicts,
        conflictLocal,
        conflictRemote,
      )
    } else if (
      key.startsWith("playerdle-colors-state:") ||
      key.startsWith("playerdle-colors-collegiate-state:")
    ) {
      // playerdle-colors-state:v1:<dateKey>
      // playerdle-colors-collegiate-state:v1:<dateKey>
      const parts = key.split(":")
      const dateKey = parts[2]
      if (!dateKey) {
        easyMerged[key] = localData[key] ?? remoteData[key]
        continue
      }
      const isCollegiate = key.startsWith("playerdle-colors-collegiate-state:")
      const historyKey = isCollegiate
        ? "playerdle-colors-collegiate-history:v1"
        : "playerdle-colors-history:v1"
      mergeStateKey(
        key,
        `Statehue${isCollegiate ? " Collegiate" : ""} puzzle (${dateKey})`,
        localData[key],
        remoteData[key],
        completedDatesSet(localData[historyKey]).has(dateKey),
        completedDatesSet(remoteData[historyKey]).has(dateKey),
        easyMerged,
        conflicts,
        conflictLocal,
        conflictRemote,
      )
    }
  }

  // Pass 3: all remaining keys not yet handled
  for (const key of allKeys) {
    if (key in easyMerged || key in conflictLocal) continue
    if (
      key.startsWith("playerdle-stats:") ||
      key.startsWith("playerdle-journey-history:") ||
      key.startsWith("playerdle-colors-history:") ||
      key.startsWith("playerdle-colors-collegiate-history:")
    )
      continue

    if (
      key.startsWith("playerdle-tutorial-seen-v2:") ||
      key.startsWith("journey-tutorial-seen:") ||
      key === "statehue-tutorial-seen" ||
      key === "statehue-collegiate-tutorial-seen"
    ) {
      easyMerged[key] =
        localData[key] === "true" || remoteData[key] === "true"
          ? "true"
          : (localData[key] ?? remoteData[key] ?? "false")
    } else if (
      key.startsWith("playerdle-journey-played-day:") ||
      key === "playerdle-colors-played-day" ||
      key === "playerdle-colors-collegiate-played-day"
    ) {
      // More recent date wins (YYYY-MM-DD lexicographic comparison is correct)
      const local = localData[key] ?? ""
      const remote = remoteData[key] ?? ""
      easyMerged[key] = local >= remote ? local : remote
    } else {
      easyMerged[key] = remoteData[key] ?? localData[key]
    }
  }

  return { easyMerged, conflicts, conflictLocal, conflictRemote, hasConflicts: conflicts.length > 0 }
}

/**
 * Produces the final merged data map given the user's conflict resolution choice.
 * Easy merges are always applied; conflicted keys use the chosen side.
 */
export function resolveMerge(
  analysis: MergeAnalysis,
  winner: "local" | "remote",
): Record<string, string> {
  const conflictValues =
    winner === "local" ? analysis.conflictLocal : analysis.conflictRemote
  return { ...analysis.easyMerged, ...conflictValues }
}

function apiUrl(hash: string): string {
  const deviceId = getDeviceId()
  return `/api/sync/${hash}?device=${encodeURIComponent(deviceId)}`
}

export async function pushToCloud(phrase: string): Promise<number> {
  const hash = await hashPassphrase(phrase)
  const payload = collectSyncData()
  const res = await fetch(apiUrl(hash), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to save to cloud")
  const body = (await res.json()) as ServerWriteResponse
  storeLastSynced()
  return body.devices
}

export interface PullResult {
  payload: SyncPayload
  devices: number
}

export async function pullFromCloud(phrase: string): Promise<PullResult> {
  const hash = await hashPassphrase(phrase)
  const res = await fetch(apiUrl(hash))
  if (res.status === 404) throw new Error("No data found for this code")
  if (!res.ok) throw new Error("Failed to fetch from cloud")
  const body = (await res.json()) as ServerGetResponse
  storeLastSynced()
  return { payload: body.payload, devices: body.devices }
}

export async function unlinkFromCloud(phrase: string): Promise<number> {
  const hash = await hashPassphrase(phrase)
  const res = await fetch(apiUrl(hash), { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to unlink")
  const body = (await res.json()) as ServerWriteResponse
  return body.devices
}

/**
 * Silently pulls from cloud and applies a best-effort merge on page load.
 * Skips if there is no stored passphrase or if conflicts need user resolution.
 */
export async function backgroundSync(): Promise<void> {
  const phrase = getPassphrase()
  if (!phrase) return
  const localData = collectSyncData().data
  const { payload } = await pullFromCloud(phrase)
  const analysis = analyzeMerge(localData, payload.data)
  if (analysis.hasConflicts) return
  const localIsBehind = Object.entries(analysis.easyMerged).some(
    ([k, v]) => localData[k] !== v,
  )
  const remoteIsBehind = Object.keys({ ...localData, ...payload.data }).some(
    k => analysis.easyMerged[k] !== payload.data[k],
  )
  if (localIsBehind) applyData(analysis.easyMerged)
  if (localIsBehind || remoteIsBehind) await pushToCloud(phrase)
}

let _bgSyncPromise: Promise<void> | null = null
const _syncListeners = new Set<() => void>()

function notifySyncListeners(): void {
  for (const fn of _syncListeners) fn()
}

/** Subscribe to changes in whether a background sync is in flight. Returns unsubscribe fn. */
export function subscribeSyncState(fn: () => void): () => void {
  _syncListeners.add(fn)
  return () => _syncListeners.delete(fn)
}

/** Returns true if a background sync is currently in flight. */
export function getIsSyncing(): boolean {
  return _bgSyncPromise !== null
}

/** Resolves when the current background sync finishes, or immediately if none is running. */
export function waitForSync(): Promise<void> {
  return _bgSyncPromise ?? Promise.resolve()
}

let _autoSyncCleanup: (() => void) | null = null
let _pushTimer: ReturnType<typeof setTimeout> | null = null
let _lastBgSyncAt = 0

function scheduleDebouncedPush(): void {
  if (_pushTimer) clearTimeout(_pushTimer)
  _pushTimer = setTimeout(() => {
    _pushTimer = null
    const phrase = getPassphrase()
    if (!phrase) return
    void pushToCloud(phrase).catch(() => {})
  }, 1500)
}

function runTrackedSync(): void {
  if (_bgSyncPromise) return
  _bgSyncPromise = backgroundSync()
    .catch(() => {})
    .finally(() => {
      _bgSyncPromise = null
      notifySyncListeners()
    })
  notifySyncListeners()
}

function backgroundSyncThrottled(): void {
  const now = Date.now()
  if (now - _lastBgSyncAt < 5_000) return
  _lastBgSyncAt = now
  runTrackedSync()
}

/**
 * Starts continuous background sync: pulls on tab focus, pushes 1.5s after local writes.
 * Idempotent — safe to call multiple times. Returns a cleanup function for useEffect.
 */
export function startAutoSync(): () => void {
  if (_autoSyncCleanup) return () => {}

  runTrackedSync()

  // Intercept localStorage.setItem to detect sync-key writes and push soon after
  const origSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value)
    if (SYNC_KEY_PREFIXES.some(p => key.startsWith(p))) scheduleDebouncedPush()
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") backgroundSyncThrottled()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key && SYNC_KEY_PREFIXES.some(p => e.key!.startsWith(p))) backgroundSyncThrottled()
  }

  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("storage", onStorage)

  const cleanup = () => {
    _autoSyncCleanup = null
    localStorage.setItem = origSetItem
    if (_pushTimer) {
      clearTimeout(_pushTimer)
      _pushTimer = null
    }
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("storage", onStorage)
  }
  _autoSyncCleanup = cleanup
  return cleanup
}
