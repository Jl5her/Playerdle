import { WORDLIST } from "./wordlist"

const PASSPHRASE_KEY = "playerdle-sync-passphrase"
const PASSPHRASE_WORD_COUNT = 5

const SYNC_KEY_PREFIXES = [
  "playerdle-stats:",
  "playerdle-state:",
  "playerdle-tutorial-seen-v2:",
  "playerdle-journey-played-day:",
  "playerdle-journey-history:",
  "playerdle-journey-state:",
]

export interface SyncPayload {
  version: 1
  lastUpdated: string
  data: Record<string, string>
}

export function generatePassphrase(): string {
  const words: string[] = []
  for (let i = 0; i < PASSPHRASE_WORD_COUNT; i++) {
    words.push(WORDLIST[Math.floor(Math.random() * WORDLIST.length)])
  }
  return words.join("-")
}

export function getOrCreatePassphrase(): string {
  try {
    const stored = localStorage.getItem(PASSPHRASE_KEY)
    if (stored) return stored
    const phrase = generatePassphrase()
    localStorage.setItem(PASSPHRASE_KEY, phrase)
    return phrase
  } catch {
    return generatePassphrase()
  }
}

export function setPassphrase(phrase: string): void {
  localStorage.setItem(PASSPHRASE_KEY, phrase)
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
  if (parts.some(p => p.length === 0)) return null
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
}

export async function pullFromCloud(phrase: string): Promise<SyncPayload> {
  const hash = await hashPassphrase(phrase)
  const res = await fetch(`/api/sync/${hash}`)
  if (res.status === 404) throw new Error("No data found for this code")
  if (!res.ok) throw new Error("Failed to fetch from cloud")
  return res.json() as Promise<SyncPayload>
}
