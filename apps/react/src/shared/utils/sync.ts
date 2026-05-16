import { WORDLIST } from "./wordlist"

const PASSPHRASE_KEY = "playerdle-sync-passphrase"
const EXPIRES_AT_KEY = "playerdle-sync-expires-at"
const LINKED_KEY = "playerdle-sync-linked"
const LAST_SYNCED_KEY = "playerdle-sync-last-synced"

export const SYNC_TTL_DAYS = 7
const PASSPHRASE_WORD_COUNT = 5

const SYNC_KEY_PREFIXES = [
  "playerdle-stats:",
  "playerdle-state:",
  "playerdle-tutorial-seen-v2:",
  "playerdle-journey-played-day:",
  "playerdle-journey-history:",
  "playerdle-journey-state:",
  "journey-tutorial-seen:",
]

export interface SyncPayload {
  version: 1
  lastUpdated: string
  data: Record<string, string>
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
  localStorage.removeItem(EXPIRES_AT_KEY)
  localStorage.removeItem(LINKED_KEY)
  localStorage.removeItem(LAST_SYNCED_KEY)
}

export function isLinked(): boolean {
  try {
    return localStorage.getItem(LINKED_KEY) === "1"
  } catch {
    return false
  }
}

export function setLinked(): void {
  try {
    localStorage.setItem(LINKED_KEY, "1")
  } catch {
    // ignore storage errors
  }
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

export function getExpiresAt(): Date | null {
  try {
    const raw = localStorage.getItem(EXPIRES_AT_KEY)
    if (!raw) return null
    const ts = parseInt(raw, 10)
    if (Number.isNaN(ts)) return null
    return new Date(ts)
  } catch {
    return null
  }
}

function storeLocalExpiry(): void {
  const ms = SYNC_TTL_DAYS * 24 * 60 * 60 * 1000
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + ms))
}

export function extendLocalExpiry(): void {
  storeLocalExpiry()
}

export function isLocallyExpired(): boolean {
  const expiresAt = getExpiresAt()
  if (!expiresAt) return false
  return expiresAt.getTime() < Date.now()
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

export async function pushToCloud(phrase: string): Promise<void> {
  const hash = await hashPassphrase(phrase)
  const payload = collectSyncData()
  const res = await fetch(`/api/sync/${hash}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to save to cloud")
  storeLocalExpiry()
  storeLastSynced()
}

export async function pullFromCloud(phrase: string): Promise<SyncPayload> {
  const hash = await hashPassphrase(phrase)
  const res = await fetch(`/api/sync/${hash}`)
  if (res.status === 404) throw new Error("No data found for this code")
  if (!res.ok) throw new Error("Failed to fetch from cloud")
  const payload = (await res.json()) as SyncPayload
  storeLastSynced()
  return payload
}
