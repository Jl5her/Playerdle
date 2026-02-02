import { fantasyPlayers, allPlayers, playerId, isSamePlayer, type Player } from "@/data/players"

export type ArcadeDifficulty = "easy" | "medium" | "hard"

// Offensive positions (default for daily and arcade)
const OFFENSIVE_POSITIONS = ["QB", "RB", "WR", "TE"]

// Defensive & Special Teams positions
const DEFENSIVE_ST_POSITIONS = ["K", "DL", "LB", "DB"]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function getDailyPlayer(date?: Date): Player {
  // Daily mode: only offensive positions (QB, RB, WR, TE)
  const eligiblePlayers = fantasyPlayers.filter(
    p => p && p.name && OFFENSIVE_POSITIONS.includes(p.position),
  )
  const targetDate = date || new Date()
  const dateStr = getDateKey(targetDate)
  const hash = hashString(dateStr)

  // Multiply by large prime (Knuth's multiplicative hash) for better distribution
  // This prevents consecutive dates from selecting consecutive players
  const shuffledIndex = (hash * 2654435761) % eligiblePlayers.length

  const fantasyPlayer = eligiblePlayers[shuffledIndex]

  // Look up full player data from allPlayers to get jersey number
  const fullPlayer = allPlayers.find(p => isSamePlayer(p, fantasyPlayer))

  return fullPlayer || fantasyPlayer
}

export function getRandomArcadePlayer(
  excludeId?: string,
  includeDefensiveST?: boolean,
): Player {
  // Arcade mode: offensive positions by default, add D/ST if enabled
  const allowedPositions = includeDefensiveST
    ? [...OFFENSIVE_POSITIONS, ...DEFENSIVE_ST_POSITIONS]
    : OFFENSIVE_POSITIONS

  const eligiblePlayers = fantasyPlayers.filter(
    p => p && p.name && allowedPositions.includes(p.position) && playerId(p) !== excludeId,
  )

  const fantasyPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)] || fantasyPlayers[0]

  // Look up full player data from allPlayers to get jersey number
  const fullPlayer = allPlayers.find(p => isSamePlayer(p, fantasyPlayer))

  return fullPlayer || fantasyPlayer
}

export function getTodayKey(): string {
  return getDateKey(new Date())
}
