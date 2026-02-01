import { fantasyPlayers, playerId, type Player } from "@/data/players"

export type ArcadeDifficulty = "easy" | "medium" | "hard"

const EASY_POSITIONS = ["QB", "RB", "WR", "TE"]
const MEDIUM_POSITIONS = ["QB", "RB", "WR", "TE", "CB", "S", "DT"]
// HARD includes all positions

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

export function getDailyPlayer(): Player {
  // Use fantasy players pool for daily answers
  const eligiblePlayers = fantasyPlayers.filter(p => p && p.name)
  const today = new Date()
  const dateStr = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`
  const index = hashString(dateStr) % eligiblePlayers.length
  return eligiblePlayers[index]
}

export function getRandomEasyPlayer(excludeId?: string): Player {
  // Use fantasy players pool for arcade answers
  const easyPlayers = fantasyPlayers.filter(
    p => p && EASY_POSITIONS.includes(p.position) && playerId(p) !== excludeId,
  )
  return easyPlayers[Math.floor(Math.random() * easyPlayers.length)] || fantasyPlayers[0]
}

export function getRandomPlayerByDifficulty(
  difficulty: ArcadeDifficulty,
  excludeId?: string,
): Player {
  let allowedPositions: string[]

  switch (difficulty) {
    case "easy":
      allowedPositions = EASY_POSITIONS
      break
    case "medium":
      allowedPositions = MEDIUM_POSITIONS
      break
    case "hard":
      // Hard mode includes all positions, so no filtering needed
      allowedPositions = []
      break
  }

  // Use fantasy players pool for arcade answers
  const filtered = fantasyPlayers.filter(p => {
    if (!p) return false
    if (playerId(p) === excludeId) return false
    if (allowedPositions.length === 0) return true // Hard mode: all positions
    return allowedPositions.includes(p.position)
  })

  return filtered[Math.floor(Math.random() * filtered.length)] || fantasyPlayers[0]
}

export function getTodayKey(): string {
  const today = new Date()
  return `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`
}
