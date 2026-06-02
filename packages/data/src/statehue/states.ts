import NFL_TEAMS from "../playerdle/nfl/teams.json"
import MLB_TEAMS from "../playerdle/mlb/teams.json"
import NBA_TEAMS from "../playerdle/nba/teams.json"
import NHL_TEAMS from "../playerdle/nhl/teams.json"

export interface ColorsTeam {
  name: string
  // Pro: NFL/MLB/NBA/NHL. Collegiate: conference name (SEC, Big Ten, ACC, etc.).
  league: string
  colors: [string, string, string]
}

export interface ColorsState {
  id: string
  name: string
  teams: ColorsTeam[]
}

const STATE_NAMES: Record<string, string> = {
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  GA: "Georgia",
  IL: "Illinois",
  IN: "Indiana",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  NC: "North Carolina",
  NJ: "New Jersey",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  WA: "Washington",
  WI: "Wisconsin",
}

type TeamEntry = { name: string; state?: string | null; colors?: string[] }

function buildColorsStates(): ColorsState[] {
  const sources: { teams: TeamEntry[]; label: string }[] = [
    { teams: NFL_TEAMS as TeamEntry[], label: "NFL" },
    { teams: MLB_TEAMS as TeamEntry[], label: "MLB" },
    { teams: NBA_TEAMS as TeamEntry[], label: "NBA" },
    { teams: NHL_TEAMS as TeamEntry[], label: "NHL" },
  ]
  const stateMap = new Map<string, ColorsTeam[]>()
  for (const { teams, label } of sources) {
    for (const team of teams) {
      const { name, state, colors } = team
      if (!state || !STATE_NAMES[state] || !colors || colors.length < 3) continue
      if (!stateMap.has(state)) stateMap.set(state, [])
      stateMap.get(state)!.push({
        name,
        league: label,
        colors: [colors[0], colors[1], colors[2]] as [string, string, string],
      })
    }
  }
  return Array.from(stateMap.entries())
    .map(([id, teams]) => ({ id, name: STATE_NAMES[id], teams }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const COLORS_STATES: ColorsState[] = buildColorsStates()

export function getColorsStateById(id: string): ColorsState | undefined {
  return COLORS_STATES.find(state => state.id === id)
}

export function getAllColorsStateNames(): string[] {
  return COLORS_STATES.map(state => state.name)
}

export function getProTeamPalette(teamName: string): [string, string, string] | undefined {
  for (const state of COLORS_STATES) {
    const team = state.teams.find(t => t.name === teamName)
    if (team) return team.colors
  }
  return undefined
}
