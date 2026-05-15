import type { GameResult, Stats } from "@playerdle/types"
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
    return JSON.parse(raw)
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
    }
  }

  const played = history.length
  const wins = history.filter(r => r.won).length
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
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = sortedHistory.length - 1; i >= 0; i -= 1) {
    const result = sortedHistory[i]
    const resultDate = new Date(result.date)
    resultDate.setHours(0, 0, 0, 0)

    if (result.won) {
      tempStreak += 1
      maxStreak = Math.max(maxStreak, tempStreak)

      // Check if this is part of current streak
      const daysDiff = Math.floor((today.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24))
      if (i === sortedHistory.length - 1 && (daysDiff === 0 || daysDiff === 1)) {
        currentStreak = tempStreak
      }
    } else {
      tempStreak = 0
      // If we hit a loss and haven't set current streak, it's 0
      if (i === sortedHistory.length - 1) {
        currentStreak = 0
      }
    }
  }

  return {
    played,
    winPercentage,
    currentStreak,
    maxStreak,
    guessDistribution,
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
