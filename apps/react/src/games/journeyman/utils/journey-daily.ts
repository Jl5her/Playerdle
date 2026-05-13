import { ELIGIBLE_JOURNEY_PLAYERS, getJourneyPlayerById, type JourneyPlayer } from "@playerdle/data/journeyman/players"
import { hashString } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"
import JOURNEY_ANSWER_POOL from "@playerdle/data/journeyman/answer_pool.json"

const MAX_GUESSES = 5

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

// Candidate set: resolved JourneyPlayers from the answer pool. Built once.
// The min-hash selection below is independent of array order, so additions or
// reorderings of JOURNEY_ANSWER_POOL never shift the date → player mapping for
// any other id — only the dates where the changed id was previously the min.
const DAILY_CANDIDATES: JourneyPlayer[] = (() => {
  const seen = new Set<string>()
  const out: JourneyPlayer[] = []
  for (const id of JOURNEY_ANSWER_POOL) {
    if (seen.has(id)) continue
    const player = getJourneyPlayerById(id)
    if (player) {
      out.push(player)
      seen.add(id)
    }
  }
  if (out.length === 0) return [...ELIGIBLE_JOURNEY_PLAYERS]
  return out
})()

function rankPlayersByHash(dateKey: string): JourneyPlayer[] {
  return DAILY_CANDIDATES.map(p => ({ p, h: hashString(`journey-player:${dateKey}:${p.id}`) }))
    .sort((a, b) => (a.h !== b.h ? a.h - b.h : a.p.id < b.p.id ? -1 : 1))
    .map(x => x.p)
}

const playerForDateCache = new Map<string, JourneyPlayer>()

function conflictsWithYesterday(candidate: JourneyPlayer, yesterday: JourneyPlayer): boolean {
  return candidate.id === yesterday.id || candidate.position === yesterday.position
}

function pickPlayerForDate(dateKey: string): JourneyPlayer {
  const cached = playerForDateCache.get(dateKey)
  if (cached) return cached

  const ranked = rankPlayersByHash(dateKey)
  let result = ranked[0]
  const yesterday = previousDateKey(dateKey)
  if (yesterday && yesterday >= JOURNEY_EPOCH_DATE_KEY) {
    const yesterdayPick = pickPlayerForDate(yesterday)
    // Avoid back-to-back same player or same position (QB/WR/RB/TE streaks).
    if (conflictsWithYesterday(result, yesterdayPick)) {
      const alt = ranked.find(p => !conflictsWithYesterday(p, yesterdayPick))
      if (alt) result = alt
    }
  }
  playerForDateCache.set(dateKey, result)
  return result
}

export const JOURNEY_EPOCH_DATE_KEY = "2025-01-01"

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
}

export function getDailyJourneyPuzzle(date?: Date): JourneyPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  return getJourneyPuzzleByDateKey(dateKey)
}

export function getJourneyPuzzleByDateKey(dateKey: string): JourneyPuzzle {
  const player = pickPlayerForDate(dateKey)
  return { player, dateKey, index: daysSinceEpoch(dateKey) + 1 }
}

export function getArcadeJourneyPuzzle(excludeId?: string): JourneyPuzzle {
  const pool = excludeId ? ELIGIBLE_JOURNEY_PLAYERS.filter(p => p.id !== excludeId) : ELIGIBLE_JOURNEY_PLAYERS
  const player = pool[Math.floor(Math.random() * pool.length)] ?? ELIGIBLE_JOURNEY_PLAYERS[0]
  return { player, dateKey: "arcade", index: 0 }
}

// Daily-played flag + history + stats — mirrors colors-daily.ts

const JOURNEY_PLAYED_KEY = "playerdle-journey-played-day"
const JOURNEY_HISTORY_KEY = "playerdle-journey-history:v1"

export function markJourneyDailyPlayed() {
  localStorage.setItem(JOURNEY_PLAYED_KEY, getTodayKey())
}

export function hasPlayedJourneyDailyToday(): boolean {
  return localStorage.getItem(JOURNEY_PLAYED_KEY) === getTodayKey()
}

export interface JourneyResult {
  date: string
  won: boolean
  guesses: number
}

export function getJourneyHistory(): JourneyResult[] {
  try {
    const raw = localStorage.getItem(JOURNEY_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as JourneyResult[]
  } catch {
    return []
  }
}

export function saveJourneyResult(date: string, won: boolean, guesses: number) {
  const history = getJourneyHistory()
  const idx = history.findIndex(r => r.date === date)
  const result: JourneyResult = { date, won, guesses }
  if (idx >= 0) history[idx] = result
  else history.push(result)
  localStorage.setItem(JOURNEY_HISTORY_KEY, JSON.stringify(history))
}

export interface JourneyStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}

export function calculateJourneyStats(): JourneyStats {
  const history = getJourneyHistory()
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
