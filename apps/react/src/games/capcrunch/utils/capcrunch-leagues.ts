import nbaCapCrunchData from "@playerdle/data/capcrunch/nba-capcrunch.json"
import nflCapCrunchData from "@playerdle/data/capcrunch/nfl-capcrunch.json"

export type CapCrunchLeague = "nfl" | "nba"

export interface CapCrunchPlayer {
  name: string
  salary: number
  number?: number
}

/**
 * Normalized team shape used throughout the game. Each comparison group maps to
 * the list of players that contribute to that group's combined salary. Raw data
 * files keep their own league-specific layout (NFL `offense`, NBA `lineup`) and
 * are normalized into this generic form at load time.
 */
export interface CapCrunchTeam {
  id: string
  name: string
  abbr: string
  groups: Record<string, CapCrunchPlayer[]>
}

/** A comparison column shown in the guess grid. */
export interface CapCrunchColumn {
  /** Stable key into `team.groups`. */
  id: string
  /** Header label. */
  label: string
  /** "Close" (yellow) feedback band, in dollars. */
  threshold: number
}

/** One player tile in the formation diagram. */
export interface CapCrunchFormationSlot {
  /** Display label (may differ from the group id, e.g. "LT" within the "OL" group). */
  label: string
  /** Group id into `team.groups`. */
  group: string
  /** Index of the player within that group. */
  index: number
}

export interface CapCrunchHowToGroup {
  label: string
  desc: string
}

export interface CapCrunchLeagueConfig {
  league: CapCrunchLeague
  /** Short uppercase tag, e.g. "NFL" / "NBA". */
  shortLabel: string
  /** Base route for this league's Cap Crunch, e.g. "/capcrunch" or "/nba/capcrunch". */
  basePath: string
  /** Where the back button returns to (sport home). */
  homePath: string
  /** Menu card description. */
  menuDescription: string
  columns: CapCrunchColumn[]
  /** Rows of slots rendered in the formation diagram. */
  formation: CapCrunchFormationSlot[][]
  /**
   * How the formation diagram is drawn. "field" renders the NFL football-field
   * layout (absolute-positioned jerseys); "rows" (default) stacks the formation
   * rows generically. The payroll table still derives from `formation` either way.
   */
  formationStyle?: "field" | "rows"
  /** Use narrower slot cards (e.g. when 5 slots fit in a single row). */
  compactSlots?: boolean
  howTo: {
    intro: string
    groupsTitle: string
    groups: CapCrunchHowToGroup[]
    feedbackRange: string
    source: string
  }
  teams: CapCrunchTeam[]
}

// ---- Raw data normalization ----

interface RawNflTeam {
  id: string
  name: string
  abbr: string
  offense: {
    QB: CapCrunchPlayer
    RB: CapCrunchPlayer
    TE: CapCrunchPlayer
    WR: CapCrunchPlayer[]
    OL: CapCrunchPlayer[]
  }
}

interface RawNbaTeam {
  id: string
  name: string
  abbr: string
  lineup: {
    PG: CapCrunchPlayer
    SG: CapCrunchPlayer
    SF: CapCrunchPlayer
    PF: CapCrunchPlayer
    C: CapCrunchPlayer
  }
}

function normalizeNflTeams(raw: RawNflTeam[]): CapCrunchTeam[] {
  return raw.map(t => ({
    id: t.id,
    name: t.name,
    abbr: t.abbr,
    groups: {
      QB: [t.offense.QB],
      RB: [t.offense.RB],
      TE: [t.offense.TE],
      WR: t.offense.WR,
      OL: t.offense.OL,
    },
  }))
}

function normalizeNbaTeams(raw: RawNbaTeam[]): CapCrunchTeam[] {
  return raw.map(t => ({
    id: t.id,
    name: t.name,
    abbr: t.abbr,
    groups: {
      PG: [t.lineup.PG],
      SG: [t.lineup.SG],
      SF: [t.lineup.SF],
      PF: [t.lineup.PF],
      C: [t.lineup.C],
    },
  }))
}

// ---- League configs ----

const NFL_CONFIG: CapCrunchLeagueConfig = {
  league: "nfl",
  shortLabel: "NFL",
  basePath: "/capcrunch",
  homePath: "/",
  menuDescription: "Guess the NFL team from their salary cap numbers",
  columns: [
    { id: "QB", label: "QB", threshold: 5_000_000 },
    { id: "RB", label: "RB", threshold: 2_000_000 },
    { id: "TE", label: "TE", threshold: 2_500_000 },
    { id: "WR", label: "WR", threshold: 7_000_000 },
    { id: "OL", label: "OL", threshold: 10_000_000 },
  ],
  formation: [
    [
      { label: "WR", group: "WR", index: 0 },
      { label: "WR", group: "WR", index: 1 },
      { label: "WR", group: "WR", index: 2 },
    ],
    [
      { label: "LT", group: "OL", index: 0 },
      { label: "LG", group: "OL", index: 1 },
      { label: "C", group: "OL", index: 2 },
      { label: "RG", group: "OL", index: 3 },
      { label: "RT", group: "OL", index: 4 },
    ],
    [{ label: "QB", group: "QB", index: 0 }],
    [
      { label: "RB", group: "RB", index: 0 },
      { label: "TE", group: "TE", index: 0 },
    ],
  ],
  formationStyle: "field",
  howTo: {
    intro: "shows you the offensive payroll of an NFL team",
    groupsTitle: "Position Groups",
    groups: [
      { label: "QB", desc: "starting quarterback AAV" },
      { label: "RB", desc: "starting running back AAV" },
      { label: "TE", desc: "starting tight end AAV" },
      { label: "WR ×3", desc: "combined salary of the top 3 wide receivers" },
      { label: "OL ×5", desc: "combined salary of the starting offensive line" },
    ],
    feedbackRange: "QB ±$5M, RB/TE ±$2-2.5M, WR ±$7M, OL ±$10M",
    source: "Salaries are 2025 Average Annual Values (AAV) sourced from Spotrac.",
  },
  teams: normalizeNflTeams(nflCapCrunchData.teams as unknown as RawNflTeam[]),
}

const NBA_CONFIG: CapCrunchLeagueConfig = {
  league: "nba",
  shortLabel: "NBA",
  basePath: "/nba/capcrunch",
  homePath: "/nba",
  menuDescription: "Guess the NBA team from their salary cap numbers",
  columns: [
    { id: "PG", label: "PG", threshold: 5_000_000 },
    { id: "SG", label: "SG", threshold: 5_000_000 },
    { id: "SF", label: "SF", threshold: 5_000_000 },
    { id: "PF", label: "PF", threshold: 5_000_000 },
    { id: "C", label: "C", threshold: 5_000_000 },
  ],
  formation: [
    [
      { label: "PG", group: "PG", index: 0 },
      { label: "SG", group: "SG", index: 0 },
      { label: "SF", group: "SF", index: 0 },
      { label: "PF", group: "PF", index: 0 },
      { label: "C", group: "C", index: 0 },
    ],
  ],
  compactSlots: true,
  howTo: {
    intro: "shows you the starting-five payroll of an NBA team",
    groupsTitle: "Positions",
    groups: [
      { label: "PG", desc: "starting point guard salary" },
      { label: "SG", desc: "starting shooting guard salary" },
      { label: "SF", desc: "starting small forward salary" },
      { label: "PF", desc: "starting power forward salary" },
      { label: "C", desc: "starting center salary" },
    ],
    feedbackRange: "each position ±$5M",
    source: "Salaries are approximate 2025-26 figures.",
  },
  teams: normalizeNbaTeams(nbaCapCrunchData.teams as unknown as RawNbaTeam[]),
}

const LEAGUE_CONFIG: Record<CapCrunchLeague, CapCrunchLeagueConfig> = {
  nfl: NFL_CONFIG,
  nba: NBA_CONFIG,
}

export function getCapCrunchLeagueConfig(league: CapCrunchLeague): CapCrunchLeagueConfig {
  return LEAGUE_CONFIG[league]
}

export function getCapCrunchTeams(league: CapCrunchLeague): CapCrunchTeam[] {
  return LEAGUE_CONFIG[league].teams
}

export function getCapCrunchTeamById(
  league: CapCrunchLeague,
  id: string,
): CapCrunchTeam | undefined {
  return LEAGUE_CONFIG[league].teams.find(t => t.id === id)
}

export function getCapCrunchColumns(league: CapCrunchLeague): CapCrunchColumn[] {
  return LEAGUE_CONFIG[league].columns
}

/** Combined salary of a team's group (sums every player in that group). */
export function groupSalary(team: CapCrunchTeam, groupId: string): number {
  return (team.groups[groupId] ?? []).reduce((sum, p) => sum + p.salary, 0)
}
