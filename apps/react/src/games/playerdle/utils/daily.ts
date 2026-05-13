import type { Player, SportConfig } from "@/games/playerdle/sports"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey } from "@/shared/utils/time"

export type ArcadeDifficulty = "easy" | "medium" | "hard"

function getEligiblePlayersForSport(sport: SportConfig): Player[] {
  return sport.answerPool
}

export function getDailyPlayer(sport: SportConfig, date?: Date): Player {
  const eligiblePlayers = getEligiblePlayersForSport(sport)
  if (eligiblePlayers.length === 0) {
    throw new Error(`No eligible players available for ${sport.id}`)
  }
  const targetDate = date || new Date()
  const dateStr = getDateKey(targetDate)
  const variantSeed = sport.activeVariantId ?? "classic"
  return minHashPick(eligiblePlayers, p => p.id, `${sport.id}:${variantSeed}:${dateStr}`)
}

export function getRandomArcadePlayer(sport: SportConfig, excludeId?: string): Player {
  const eligiblePlayers = getEligiblePlayersForSport(sport).filter(p => p.id !== excludeId)
  return (
    eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)] ||
    getEligiblePlayersForSport(sport)[0]
  )
}

export { getTodayKey } from "@/shared/utils/time"
