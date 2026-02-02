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

/**
 * Normalize a player name for matching (same logic as Python scraper).
 * Removes apostrophes, suffixes (Jr, Sr, II, III, etc.).
 */
function normalizeName(name: string): string {
  let normalized = name.trim()

  // Remove apostrophes and special characters
  normalized = normalized.replace(/['']/g, "")

  // Remove common suffixes (case-insensitive)
  const suffixes = [' Jr.', ' Jr', ' Sr.', ' Sr', ' II', ' III', ' IV', ' V']
  const nameLower = normalized.toLowerCase()

  for (const suffix of suffixes) {
    if (nameLower.endsWith(suffix.toLowerCase())) {
      normalized = normalized.slice(0, normalized.length - suffix.length)
      break
    }
  }

  return normalized.trim().toLowerCase()
}

/**
 * Normalize position for matching (same logic as Python scraper).
 * Maps defensive line positions to DL.
 */
function normalizePosition(position: string): string {
  const pos = position.toUpperCase().trim()

  // Map defensive line positions to DL
  if (pos === 'DE' || pos === 'DT' || pos === 'NT') {
    return 'DL'
  }

  return pos
}

/**
 * Check if two positions are compatible for matching.
 * Handles edge cases like edge-rushing LBs, hybrid TE/QB, etc.
 */
function positionsAreCompatible(pos1: string, pos2: string): boolean {
  const p1 = pos1.toUpperCase().trim()
  const p2 = pos2.toUpperCase().trim()

  // Exact match after normalization
  if (normalizePosition(p1) === normalizePosition(p2)) {
    return true
  }

  // Edge rushers can go both ways
  if ((p1 === 'DL' && p2 === 'LB') || (p1 === 'LB' && p2 === 'DL')) {
    return true
  }
  if ((p1 === 'LB' && (p2 === 'DE' || p2 === 'DT')) || ((p1 === 'DE' || p1 === 'DT') && p2 === 'LB')) {
    return true
  }

  // Hybrid QB/TE (Taysom Hill)
  if ((p1 === 'QB' && p2 === 'TE') || (p1 === 'TE' && p2 === 'QB')) {
    return true
  }

  // Defensive backs
  if ((p1 === 'DB' && (p2 === 'CB' || p2 === 'S')) || ((p1 === 'CB' || p1 === 'S') && p2 === 'DB')) {
    return true
  }

  // Fullbacks as running backs
  if ((p1 === 'RB' && p2 === 'FB') || (p1 === 'FB' && p2 === 'RB')) {
    return true
  }

  return false
}

/** 
 * Check if two players are the same person.
 * Uses the same normalization logic as Python validation:
 * - Normalizes names (removes apostrophes, suffixes)
 * - Checks position compatibility (handles edge rushers, hybrid players, etc.)
 */
export function isSamePlayer(p1: Player | undefined, p2: Player | undefined): boolean {
  if (!p1 || !p2) return false

  // Normalize names and check for match
  const name1 = normalizeName(p1.name)
  const name2 = normalizeName(p2.name)

  // Known nickname mappings
  const nicknameMap: Record<string, string> = {
    'marquise brown': 'hollywood brown',
    'hollywood brown': 'marquise brown',
  }

  const namesMatch = name1 === name2 ||
    nicknameMap[name1] === name2 ||
    nicknameMap[name2] === name1

  if (!namesMatch) return false

  // Check position compatibility
  return positionsAreCompatible(p1.position, p2.position)
}
