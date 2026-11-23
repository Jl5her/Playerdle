// Shared helpers for the Journeyman sync scripts: roster-based current-team
// detection and active/retired status.
//
// The Playerdle roster files (packages/data/src/playerdle/<league>/players.json)
// are scraped daily from team rosters and are the most reliable signal that a
// player is currently signed. They are used to:
//   1. append a player's current team to the end of their career path when the
//      path doesn't already end there (e.g. signed but hasn't played yet, or
//      the stats source lags behind a trade), and
//   2. mark them active.
// Players not on a roster may be free agents, injured, or retired, so for those
// the league API's own active flag decides, falling back to how long ago their
// last season was.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export type League = "nfl" | "mlb" | "nba" | "nhl"

export interface StatusPlayer {
  name: string
  teams: string[]
  active?: boolean
  retiredYear?: number
}

interface RosterEntry {
  id: string
  name: string
  team: string
  position?: string
}

export interface RosterIndex {
  byId: Map<string, RosterEntry>
  byName: Map<string, RosterEntry[]>
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv)$/, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function loadRosterIndex(dataRoot: string, league: League): RosterIndex {
  const path = resolve(dataRoot, `playerdle/${league}/players.json`)
  const roster = JSON.parse(readFileSync(path, "utf-8")) as RosterEntry[]
  const byId = new Map<string, RosterEntry>()
  const byName = new Map<string, RosterEntry[]>()
  for (const r of roster) {
    byId.set(r.id, r)
    const key = normalizeName(r.name)
    const list = byName.get(key) ?? []
    list.push(r)
    byName.set(key, list)
  }
  return { byId, byName }
}

/**
 * Finds a player's current roster entry. Prefers an exact ESPN-id match (roster
 * IDs are `<league>:<espnId>`); otherwise requires a unique name match so two
 * players sharing a name never get conflated.
 */
export function findOnRoster(
  index: RosterIndex,
  league: League,
  name: string,
  position: string,
  espnId?: string,
): RosterEntry | undefined {
  if (espnId) {
    const hit = index.byId.get(`${league}:${espnId}`)
    if (hit) return hit
  }
  const matches = index.byName.get(normalizeName(name)) ?? []
  if (matches.length !== 1) return undefined
  const [match] = matches
  // Name-only match: also require a compatible position, so a retired player
  // is never mistaken for an active one who happens to share their name.
  return positionGroup(league, match.position) === positionGroup(league, position)
    ? match
    : undefined
}

function positionGroup(league: League, position: string | undefined): string {
  const pos = (position ?? "").toUpperCase()
  switch (league) {
    case "nhl":
      return pos === "G" ? "G" : pos === "D" ? "D" : "F"
    case "mlb":
      return ["P", "SP", "RP"].includes(pos) ? "P" : "H"
    case "nba":
      return "any" // G/F/C labels overlap too much between sources to compare
    case "nfl":
      return pos
  }
}

/**
 * The season currently in progress (or most recently finished), labeled the
 * same way as `lastSeasonYear`: the start year for NFL/MLB ("2025 season"),
 * the end year for NBA/NHL ("2025-26" → 2026). NFL seasons run into February
 * and NBA/NHL seasons start in October, so the label rolls over accordingly.
 */
export function currentSeasonYear(league: League, now = new Date()): number {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  switch (league) {
    case "nfl":
      return month <= 2 ? year - 1 : year
    case "mlb":
      return year
    case "nba":
    case "nhl":
      return month >= 10 ? year + 1 : year
  }
}

export interface StatusInput {
  league: League
  /** Roster entry from findOnRoster(), if any. */
  rosterEntry?: RosterEntry
  /** The league API's own active flag, when the API was reachable. */
  apiActive?: boolean
  /** Final season the player appeared in, labeled as in currentSeasonYear(). */
  lastSeasonYear?: number
  validTeamNames: Set<string>
  normalizeTeam?: (name: string) => string
}

export interface StatusChange {
  appendedTeam?: string
  unknownTeam?: string
  statusChanged: boolean
}

/**
 * Mutates `p` in place: appends the current roster team if it differs from the
 * last team in the path, and sets `active` / `retiredYear`.
 *
 * Precedence:
 *  - On a current roster → active.
 *  - Played this season → active.
 *  - Last played last season → active unless the API says inactive
 *    (unsigned free agents stay "active" until a full season passes).
 *  - Last played earlier → retired, retiredYear = last season.
 *  - No career data → fall back to the API flag; with neither, keep what was
 *    stored before. (API flags alone are unreliable for long-retired players,
 *    so they never override career data.)
 */
export function applyStatus(p: StatusPlayer, input: StatusInput): StatusChange {
  const before = `${p.active}:${p.retiredYear}`
  const change: StatusChange = { statusChanged: false }
  const current = currentSeasonYear(input.league)
  const last = input.lastSeasonYear

  if (input.rosterEntry) {
    const team = input.normalizeTeam
      ? input.normalizeTeam(input.rosterEntry.team)
      : input.rosterEntry.team
    if (!input.validTeamNames.has(team)) {
      change.unknownTeam = team
    } else if (p.teams[p.teams.length - 1] !== team) {
      p.teams.push(team)
      change.appendedTeam = team
    }
    setActive(p)
  } else if (last !== undefined) {
    if (last >= current) setActive(p)
    else if (last === current - 1 && input.apiActive !== false) setActive(p)
    else setRetired(p, last)
  } else if (input.apiActive === true) {
    setActive(p)
  } else if (input.apiActive === false) {
    setRetired(p, undefined)
  }

  change.statusChanged = before !== `${p.active}:${p.retiredYear}`
  return change
}

function setActive(p: StatusPlayer) {
  p.active = true
  delete p.retiredYear
}

function setRetired(p: StatusPlayer, year: number | undefined) {
  p.active = false
  if (year !== undefined) p.retiredYear = year
  else delete p.retiredYear
}

/** Extra property lines for a generated players.ts block. */
export function statusLines(p: StatusPlayer, pad: string): string[] {
  const lines: string[] = []
  if (p.active !== undefined) lines.push(`${pad}active: ${p.active},`)
  if (p.retiredYear !== undefined) lines.push(`${pad}retiredYear: ${p.retiredYear},`)
  return lines
}
