import type { Player, SportConfig } from "@/sports"

export type ArcadeDifficulty = "easy" | "medium" | "hard"

const EASTERN_TIME_ZONE = "America/New_York"

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

function getDateKeyInEasternTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date)
}

function getEligiblePlayersForSport(sport: SportConfig): Player[] {
  return sport.answerPool
}

export function getDailyPlayer(sport: SportConfig, date?: Date): Player {
  const eligiblePlayers = getEligiblePlayersForSport(sport)
  const targetDate = date || new Date()
  const dateStr = getDateKeyInEasternTime(targetDate)
  const hash = hashString(`${sport.id}:${dateStr}`)
  const shuffledIndex = (hash * 2654435761) % eligiblePlayers.length
  return eligiblePlayers[shuffledIndex]
}

export function getRandomArcadePlayer(sport: SportConfig, excludeId?: string): Player {
  const eligiblePlayers = getEligiblePlayersForSport(sport).filter(p => p.id !== excludeId)
  return (
    eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)] ||
    getEligiblePlayersForSport(sport)[0]
  )
}

export function getTodayKey(): string {
  return getDateKeyInEasternTime(new Date())
}

export function getTodayKeyInEasternTime(): string {
  return getTodayKey()
}
