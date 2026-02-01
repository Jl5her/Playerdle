import playersData from "./players.json"
import fantasyPlayersData from "./fantasy_players.json"
import { getTeam, getTeamByAbbr } from "./teams.ts"

export interface RawPlayer {
  espnId: string | null
  teamId: number
  name: string
  position: string
  number: number
}

export interface Player extends RawPlayer {
  conference: string
  division: string
  team: string
}

export interface FantasyPlayer {
  rank: number
  name: string
  position: string
  team: string | null
  conference: string | null
  division: string | null
  number: number
}

function resolvePlayer(raw: RawPlayer): Player {
  const team = getTeam(raw.teamId)
  return {
    ...raw,
    conference: team.conference,
    division: team.division,
    team: team.name,
  }
}

function convertFantasyToPlayer(fp: FantasyPlayer): Player {
  // Look up the full team data by abbreviation
  const teamData = fp.team ? getTeamByAbbr(fp.team) : undefined

  return {
    espnId: null,
    teamId: 0, // Fantasy players don't have teamId
    name: fp.name,
    position: fp.position,
    number: fp.number,
    conference: teamData?.conference || fp.conference || "",
    division: teamData?.division || fp.division || "",
    team: teamData?.name || fp.team || "",
  }
}

export const allPlayers: Player[] = (playersData as RawPlayer[]).map(resolvePlayer)
export const fantasyPlayers: Player[] = (fantasyPlayersData as FantasyPlayer[]).map(
  convertFantasyToPlayer,
)

// ==========================================
// DATABASE SELECTION:
// - players: Used for autocomplete/guessing (all NFL players)
// - fantasyPlayers: Used for daily/arcade answers (fantasy-relevant players)
// ==========================================
export const players: Player[] = allPlayers // All players for guessing

/** Stable unique identifier for a player. Uses ESPN ID when available, falls back to name + teamId. */
export function playerId(p: Player | undefined): string {
  if (!p) return ""
  return p.espnId ?? `${p.name}-${p.teamId}`
}

/** Check if two players are the same person (matches by name and position) */
export function isSamePlayer(p1: Player | undefined, p2: Player | undefined): boolean {
  if (!p1 || !p2) return false
  return p1.name === p2.name && p1.position === p2.position
}
