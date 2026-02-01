const STATS_KEY = "playerdle-stats"

export interface GameResult {
  date: string
  won: boolean
  guesses: number
}

export interface Stats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}

export function saveGameResult(won: boolean, guesses: number) {
  const today = new Date().toISOString().split("T")[0]
  const result: GameResult = { date: today, won, guesses }

  const history = getGameHistory()

  // Update or add today's result (only keep one per day)
  const existingIndex = history.findIndex(r => r.date === today)
  if (existingIndex >= 0) {
    history[existingIndex] = result
  } else {
    history.push(result)
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(history))
}

export function getGameHistory(): GameResult[] {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function calculateStats(): Stats {
  const history = getGameHistory()

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

  // Calculate streaks
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

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
