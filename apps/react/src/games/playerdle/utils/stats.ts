import type { GameResult, Stats } from "@playerdle/types"
import { parseDateKey } from "@/shared/utils/calendar-date"
import { getTodayKey } from "@/shared/utils/time"

export type { GameResult, Stats }

const STATS_KEY_PREFIX = "playerdle-stats"

function getStatsKey(sportId: string, variantId?: string): string {
  return `${STATS_KEY_PREFIX}:${sportId}:${variantId ?? "classic"}`
}

export function saveGameResult(
  sportId: string,
  won: boolean,
  guesses: number,
  variantId?: string,
  guessIds?: string[],
  dateKey?: string,
) {
  const today = getTodayKey()
  const date = dateKey ?? today
  const archive = date !== today
  const history = getGameHistory(sportId, variantId)

  const existingIndex = history.findIndex(r => r.date === date)
  const existing = existingIndex >= 0 ? history[existingIndex] : undefined
  const result: GameResult = {
    date,
    won,
    guesses,
    guessIds: guessIds ?? existing?.guessIds,
    archive: archive || existing?.archive,
  }

  if (existingIndex >= 0) {
    history[existingIndex] = result
  } else {
    history.push(result)
  }

  localStorage.setItem(getStatsKey(sportId, variantId), JSON.stringify(history))
}

export function getGameHistory(sportId: string, variantId?: string): GameResult[] {
  try {
    const raw = localStorage.getItem(getStatsKey(sportId, variantId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function calculateStats(sportId: string, variantId?: string): Stats {
  const history = getGameHistory(sportId, variantId)

  if (history.length === 0) {
    return {
      played: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
      losses: 0,
    }
  }

  const played = history.length
  const wins = history.filter(r => r.won).length
  const losses = played - wins
  const winPercentage = Math.round((wins / played) * 100)

  // Calculate guess distribution
  const guessDistribution: Record<number, number> = {}
  for (let i = 1; i <= 6; i += 1) {
    guessDistribution[i] = 0
  }
  history.forEach(result => {
    if (result.won && result.guesses >= 1 && result.guesses <= 6) {
      guessDistribution[result.guesses] += 1
    }
  })

  // Calculate streaks — archive plays (replayed after the day) don't count.
  const sortedHistory = history
    .filter(r => !r.archive)
    .sort((a, b) => parseDateKey(a.date).getTime() - parseDateKey(b.date).getTime())

  // maxStreak: longest run of consecutive wins (only losses break it, skipped days don't)
  let maxStreak = 0
  let tempStreak = 0
  for (const result of sortedHistory) {
    if (result.won) {
      tempStreak += 1
      if (tempStreak > maxStreak) maxStreak = tempStreak
    } else {
      tempStreak = 0
    }
  }

  // currentStreak: consecutive wins walking back from the most recent entry.
  // Only active if the most recent play was today or yesterday.
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = sortedHistory.length - 1; i >= 0; i -= 1) {
    const result = sortedHistory[i]
    if (!result.won) break
    if (i === sortedHistory.length - 1) {
      const resultDate = parseDateKey(result.date)
      const daysDiff = Math.floor((today.getTime() - resultDate.getTime()) / 86_400_000)
      if (daysDiff > 1) break
    }
    currentStreak += 1
  }

  return {
    played,
    winPercentage,
    currentStreak,
    maxStreak,
    guessDistribution,
    losses,
  }
}

export function hasBeatTodaysDaily(sportId: string, variantId?: string): boolean {
  const today = getTodayKey()
  const history = getGameHistory(sportId, variantId)
  const todayResult = history.find(r => r.date === today)
  return todayResult?.won ?? false
}

export function hasPlayedTodaysDaily(sportId: string, variantId?: string): boolean {
  const today = getTodayKey()
  const history = getGameHistory(sportId, variantId)
  return history.some(r => r.date === today)
}

export function isInProgressTodaysDaily(sportId: string, variantId?: string): boolean {
  if (hasPlayedTodaysDaily(sportId, variantId)) return false
  const today = getTodayKey()
  const stateKey = `playerdle-state:${sportId}:${variantId ?? "classic"}:${today}`
  try {
    const raw = localStorage.getItem(stateKey)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : (parsed?.guesses ?? parsed?.guessIds ?? [])
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}
