import {
  getLeagueJourneyData,
  isJourneyLeague,
  type JourneyLeague,
  type JourneyPlayer,
} from "@playerdle/data/journeyman/leagues"
import { hashString } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

const MAX_GUESSES = 5

export type { JourneyLeague, JourneyPlayer }
export { isJourneyLeague }

export const JOURNEY_EPOCH_DATE_KEY = "2025-01-01"

function previousDateKey(dateKey: string): string | undefined {
  const [y, m, d] = dateKey.split("-").map(Number)
  if (!y || !m || !d) return undefined
  const t = Date.UTC(y, m - 1, d) - 86_400_000
  const date = new Date(t)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

interface LeagueRuntime {
  candidates: JourneyPlayer[]
  byId: Map<string, JourneyPlayer>
  cache: Map<string, JourneyPlayer>
}

const runtimes = new Map<JourneyLeague, LeagueRuntime>()

function getRuntime(league: JourneyLeague): LeagueRuntime {
  const existing = runtimes.get(league)
  if (existing) return existing
  const data = getLeagueJourneyData(league)
  const byId = new Map(data.players.map(p => [p.id, p]))
  const seen = new Set<string>()
  const candidates: JourneyPlayer[] = []
  for (const id of data.answerPool) {
    if (seen.has(id)) continue
    const player = byId.get(id)
    if (player) {
      candidates.push(player)
      seen.add(id)
    }
  }
  if (candidates.length === 0) {
    candidates.push(...data.eligiblePlayers)
  }
  const runtime: LeagueRuntime = {
    candidates,
    byId,
    cache: new Map(),
  }
  runtimes.set(league, runtime)
  return runtime
}

function rankPlayersByHash(league: JourneyLeague, dateKey: string): JourneyPlayer[] {
  const { candidates } = getRuntime(league)
  return candidates
    .map(p => ({ p, h: hashString(`journey-player:${league}:${dateKey}:${p.id}`) }))
    .sort((a, b) => (a.h !== b.h ? a.h - b.h : a.p.id < b.p.id ? -1 : 1))
    .map(x => x.p)
}

function conflictsWithYesterday(candidate: JourneyPlayer, yesterday: JourneyPlayer): boolean {
  return candidate.id === yesterday.id || candidate.position === yesterday.position
}

function pickPlayerForDate(league: JourneyLeague, dateKey: string): JourneyPlayer {
  const runtime = getRuntime(league)
  const cached = runtime.cache.get(dateKey)
  if (cached) return cached

  const ranked = rankPlayersByHash(league, dateKey)
  let result = ranked[0]
  const yesterday = previousDateKey(dateKey)
  if (yesterday && yesterday >= JOURNEY_EPOCH_DATE_KEY) {
    const yesterdayPick = pickPlayerForDate(league, yesterday)
    if (conflictsWithYesterday(result, yesterdayPick)) {
      const alt = ranked.find(p => !conflictsWithYesterday(p, yesterdayPick))
      if (alt) result = alt
    }
  }
  runtime.cache.set(dateKey, result)
  return result
}

function daysSinceEpoch(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  const target = Date.UTC(year, month - 1, day)
  const [ey, em, ed] = JOURNEY_EPOCH_DATE_KEY.split("-").map(Number)
  const epoch = Date.UTC(ey, em - 1, ed)
  return Math.floor((target - epoch) / 86_400_000)
}

export interface JourneyPuzzle {
  player: JourneyPlayer
  dateKey: string
  index: number
  league: JourneyLeague
}

export function getDailyJourneyPuzzle(league: JourneyLeague, date?: Date): JourneyPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  return getJourneyPuzzleByDateKey(league, dateKey)
}

export function getJourneyPuzzleByDateKey(league: JourneyLeague, dateKey: string): JourneyPuzzle {
  const player = pickPlayerForDate(league, dateKey)
  return { player, dateKey, index: daysSinceEpoch(dateKey) + 1, league }
}

export function getArcadeJourneyPuzzle(league: JourneyLeague, excludeId?: string): JourneyPuzzle {
  const data = getLeagueJourneyData(league)
  const pool = excludeId ? data.eligiblePlayers.filter(p => p.id !== excludeId) : data.eligiblePlayers
  const player = pool[Math.floor(Math.random() * pool.length)] ?? data.eligiblePlayers[0]
  return { player, dateKey: "arcade", index: 0, league }
}

function playedKey(league: JourneyLeague): string {
  return `playerdle-journey-played-day:${league}`
}

function historyKey(league: JourneyLeague): string {
  return `playerdle-journey-history:v1:${league}`
}

// Legacy localStorage keys (NFL-only era) — read once and migrate so existing
// NFL streaks/history don't reset when the multi-league storage layout lands.
const LEGACY_NFL_PLAYED_KEY = "playerdle-journey-played-day"
const LEGACY_NFL_HISTORY_KEY = "playerdle-journey-history:v1"

let migratedLegacy = false
function migrateLegacyIfNeeded() {
  if (migratedLegacy) return
  migratedLegacy = true
  if (typeof localStorage === "undefined") return
  try {
    const newPlayedKey = playedKey("nfl")
    if (!localStorage.getItem(newPlayedKey)) {
      const legacy = localStorage.getItem(LEGACY_NFL_PLAYED_KEY)
      if (legacy) localStorage.setItem(newPlayedKey, legacy)
    }
    const newHistoryKey = historyKey("nfl")
    if (!localStorage.getItem(newHistoryKey)) {
      const legacy = localStorage.getItem(LEGACY_NFL_HISTORY_KEY)
      if (legacy) localStorage.setItem(newHistoryKey, legacy)
    }
  } catch {
    // ignore
  }
}

export function markJourneyDailyPlayed(league: JourneyLeague) {
  migrateLegacyIfNeeded()
  localStorage.setItem(playedKey(league), getTodayKey())
}

export function hasPlayedJourneyDailyToday(league: JourneyLeague): boolean {
  migrateLegacyIfNeeded()
  return localStorage.getItem(playedKey(league)) === getTodayKey()
}

export interface JourneyResult {
  date: string
  won: boolean
  guesses: number
}

export function getJourneyHistory(league: JourneyLeague): JourneyResult[] {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(historyKey(league))
    if (!raw) return []
    return JSON.parse(raw) as JourneyResult[]
  } catch {
    return []
  }
}

export function saveJourneyResult(
  league: JourneyLeague,
  date: string,
  won: boolean,
  guesses: number,
) {
  migrateLegacyIfNeeded()
  const history = getJourneyHistory(league)
  const idx = history.findIndex(r => r.date === date)
  const result: JourneyResult = { date, won, guesses }
  if (idx >= 0) history[idx] = result
  else history.push(result)
  localStorage.setItem(historyKey(league), JSON.stringify(history))
}

export interface JourneyStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}

export function calculateJourneyStats(league: JourneyLeague): JourneyStats {
  const history = getJourneyHistory(league)
  if (history.length === 0) {
    return { played: 0, winPercentage: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {} }
  }
  const played = history.length
  const wins = history.filter(r => r.won).length
  const winPercentage = Math.round((wins / played) * 100)
  const guessDistribution: Record<number, number> = {}
  for (let i = 1; i <= MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= MAX_GUESSES) {
      guessDistribution[r.guesses] += 1
    }
  }
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i]
    const d = new Date(r.date)
    d.setHours(0, 0, 0, 0)
    if (r.won) {
      tempStreak += 1
      if (tempStreak > maxStreak) maxStreak = tempStreak
      const daysDiff = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
      if (i === sorted.length - 1 && (daysDiff === 0 || daysDiff === 1)) {
        currentStreak = tempStreak
      }
    } else {
      tempStreak = 0
      if (i === sorted.length - 1) currentStreak = 0
    }
  }
  return { played, winPercentage, currentStreak, maxStreak, guessDistribution }
}
