import type { Player, SportConfig } from "@/games/playerdle/sports"
import { getDateKeyInEasternTime } from "@/shared/utils/time"

export type ArcadeDifficulty = "easy" | "medium" | "hard"

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

function getEligiblePlayersForSport(sport: SportConfig): Player[] {
  return sport.answerPool
}

export function getDailyPlayer(sport: SportConfig, date?: Date): Player {
  const eligiblePlayers = getEligiblePlayersForSport(sport)
  if (eligiblePlayers.length === 0) {
    throw new Error(`No eligible players available for ${sport.id}`)
  }
  const targetDate = date || new Date()
  const dateStr = getDateKeyInEasternTime(targetDate)
  const variantSeed = sport.activeVariantId ?? "classic"
  const hash = hashString(`${sport.id}:${variantSeed}:${dateStr}`)
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

export { getTodayKey, getTodayKeyInEasternTime } from "@/shared/utils/time"
