import {
  ELIGIBLE_POSITIONS as NFL_ELIGIBLE_POSITIONS,
  JOURNEY_PLAYERS as NFL_JOURNEY_PLAYERS,
  type JourneyPlayer,
} from "./players"
import { MLB_ELIGIBLE_POSITIONS, MLB_JOURNEY_PLAYERS } from "./mlb-players"
import { NBA_ELIGIBLE_POSITIONS, NBA_JOURNEY_PLAYERS } from "./nba-players"
import { NHL_ELIGIBLE_POSITIONS, NHL_JOURNEY_PLAYERS } from "./nhl-players"

import NFL_ANSWER_POOL from "./nfl-answer-pool.json"
import MLB_ANSWER_POOL from "./mlb-answer-pool.json"
import NBA_ANSWER_POOL from "./nba-answer-pool.json"
import NHL_ANSWER_POOL from "./nhl-answer-pool.json"

import NFL_TEAMS from "../playerdle/nfl/teams.json"
import MLB_TEAMS from "../playerdle/mlb/teams.json"
import NBA_TEAMS from "../playerdle/nba/teams.json"
import NHL_TEAMS from "../playerdle/nhl/teams.json"

// Build a teamName → 3-color palette resolver from a playerdle teams.json
// array. teams.json is the canonical brand-color source for the whole app;
// Playerdle uses colors[0..1] for tile chrome, Journeyman uses colors[0..2]
// for the ladder diamonds.
function buildPaletteLookup(
  teams: Array<{ name: string; colors?: string[] }>,
): (team: string) => [string, string, string] | undefined {
  const map = new Map<string, [string, string, string]>()
  for (const t of teams) {
    const c = t.colors
    if (!c || c.length < 2) continue
    map.set(t.name, [c[0], c[1], c[2] ?? "transparent"])
  }
  return name => map.get(name)
}

function buildColorNameLookup(
  teams: Array<{ colors?: string[]; colorNames?: string[] }>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) {
    if (!t.colors || !t.colorNames) continue
    t.colors.forEach((hex, i) => {
      const name = t.colorNames![i]
      if (name) map.set(hex.toLowerCase(), name)
    })
  }
  return map
}

const getNflTeamPalette = buildPaletteLookup(NFL_TEAMS)
const getMlbTeamPalette = buildPaletteLookup(MLB_TEAMS)
const getNbaTeamPalette = buildPaletteLookup(NBA_TEAMS)
const getNhlTeamPalette = buildPaletteLookup(NHL_TEAMS)

export const TEAM_COLOR_NAME_MAP: Map<string, string> = new Map([
  ...buildColorNameLookup(NFL_TEAMS),
  ...buildColorNameLookup(MLB_TEAMS),
  ...buildColorNameLookup(NBA_TEAMS),
  ...buildColorNameLookup(NHL_TEAMS),
])

// JourneyLeague enumerates every league with a registered Journeyman puzzle.
// Add new leagues here AND register them in the LEAGUES record below; the
// rest of the app (routing, main-menu tile, autocomplete) wires through the
// registry automatically.
export type JourneyLeague = "nfl" | "mlb" | "nba" | "nhl"
export const JOURNEY_LEAGUES: ReadonlyArray<JourneyLeague> = ["nfl", "mlb", "nba", "nhl"]

export interface LeagueJourneyData {
  league: JourneyLeague
  label: string
  players: JourneyPlayer[]
  eligiblePositions: ReadonlyArray<string>
  eligiblePlayers: JourneyPlayer[]
  answerPool: string[]
  getTeamPalette: (team: string) => [string, string, string] | undefined
  // Whether the puzzle includes a college rung at the top of the team ladder.
  hasCollegeRung: boolean
}

function buildLeague(
  league: JourneyLeague,
  label: string,
  players: JourneyPlayer[],
  eligiblePositions: ReadonlyArray<string>,
  answerPool: string[],
  getTeamPalette: (team: string) => [string, string, string] | undefined,
  hasCollegeRung: boolean,
): LeagueJourneyData {
  const eligibleSet = new Set(eligiblePositions)
  const eligiblePlayers = players.filter(p => eligibleSet.has(p.position))
  return {
    league,
    label,
    players,
    eligiblePositions,
    eligiblePlayers,
    answerPool,
    getTeamPalette,
    hasCollegeRung,
  }
}

const LEAGUES: Record<JourneyLeague, LeagueJourneyData> = {
  nfl: buildLeague(
    "nfl",
    "NFL",
    NFL_JOURNEY_PLAYERS,
    NFL_ELIGIBLE_POSITIONS,
    NFL_ANSWER_POOL,
    getNflTeamPalette,
    true,
  ),
  mlb: buildLeague(
    "mlb",
    "MLB",
    MLB_JOURNEY_PLAYERS,
    MLB_ELIGIBLE_POSITIONS,
    MLB_ANSWER_POOL,
    getMlbTeamPalette,
    false,
  ),
  nba: buildLeague(
    "nba",
    "NBA",
    NBA_JOURNEY_PLAYERS,
    NBA_ELIGIBLE_POSITIONS,
    NBA_ANSWER_POOL,
    getNbaTeamPalette,
    true,
  ),
  nhl: buildLeague(
    "nhl",
    "NHL",
    NHL_JOURNEY_PLAYERS,
    NHL_ELIGIBLE_POSITIONS,
    NHL_ANSWER_POOL,
    getNhlTeamPalette,
    false,
  ),
}

export function getLeagueJourneyData(league: JourneyLeague): LeagueJourneyData {
  return LEAGUES[league]
}

export function isJourneyLeague(value: string): value is JourneyLeague {
  return (JOURNEY_LEAGUES as ReadonlyArray<string>).includes(value as JourneyLeague)
}

export type { JourneyPlayer }
