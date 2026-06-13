import NFL_TEAMS from "../playerdle/nfl/teams.json"
import MLB_TEAMS from "../playerdle/mlb/teams.json"
import NBA_TEAMS from "../playerdle/nba/teams.json"
import NHL_TEAMS from "../playerdle/nhl/teams.json"

export interface ColorsTeam {
  name: string
  // Pro: NFL/MLB/NBA/NHL. Collegiate: conference name (SEC, Big Ten, ACC, etc.).
  league: string
  colors: [string, string, string]
  colorNames?: [string, string, string]
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
  PA: "Pennsylvania",
  TN: "Tennessee",
  TX: "Texas",
  WA: "Washington",
  WI: "Wisconsin",
}

// State overrides for leagues whose teams.json lacks a `state` field.
// Only covers the 21 states in STATE_NAMES; teams outside those states are omitted.
const TEAM_STATE_OVERRIDES: Record<string, string> = {
  // MLB
  "Arizona Diamondbacks": "AZ",
  Athletics: "NV",
  "Atlanta Braves": "GA",
  "Baltimore Orioles": "MD",
  "Boston Red Sox": "MA",
  "Chicago Cubs": "IL",
  "Chicago White Sox": "IL",
  "Cincinnati Reds": "OH",
  "Cleveland Guardians": "OH",
  "Colorado Rockies": "CO",
  "Detroit Tigers": "MI",
  "Houston Astros": "TX",
  "Kansas City Royals": "MO",
  "Los Angeles Angels": "CA",
  "Los Angeles Dodgers": "CA",
  "Miami Marlins": "FL",
  "Milwaukee Brewers": "WI",
  "Minnesota Twins": "MN",
  "New York Mets": "NY",
  "New York Yankees": "NY",
  "Philadelphia Phillies": "PA",
  "Pittsburgh Pirates": "PA",
  "San Diego Padres": "CA",
  "San Francisco Giants": "CA",
  "Seattle Mariners": "WA",
  "St. Louis Cardinals": "MO",
  "Tampa Bay Rays": "FL",
  "Texas Rangers": "TX",
  // NBA
  "Atlanta Hawks": "GA",
  "Boston Celtics": "MA",
  "Brooklyn Nets": "NY",
  "Charlotte Hornets": "NC",
  "Chicago Bulls": "IL",
  "Cleveland Cavaliers": "OH",
  "Dallas Mavericks": "TX",
  "Denver Nuggets": "CO",
  "Detroit Pistons": "MI",
  "Golden State Warriors": "CA",
  "Houston Rockets": "TX",
  "LA Clippers": "CA",
  "Los Angeles Lakers": "CA",
  "Memphis Grizzlies": "TN",
  "Miami Heat": "FL",
  "Milwaukee Bucks": "WI",
  "Minnesota Timberwolves": "MN",
  "New York Knicks": "NY",
  "Orlando Magic": "FL",
  "Philadelphia 76ers": "PA",
  "Phoenix Suns": "AZ",
  "Sacramento Kings": "CA",
  "San Antonio Spurs": "TX",
  // NHL
  "Anaheim Ducks": "CA",
  "Boston Bruins": "MA",
  "Buffalo Sabres": "NY",
  "Carolina Hurricanes": "NC",
  "Chicago Blackhawks": "IL",
  "Colorado Avalanche": "CO",
  "Columbus Blue Jackets": "OH",
  "Dallas Stars": "TX",
  "Detroit Red Wings": "MI",
  "Florida Panthers": "FL",
  "Los Angeles Kings": "CA",
  "Minnesota Wild": "MN",
  "Nashville Predators": "TN",
  "New Jersey Devils": "NJ",
  "New York Islanders": "NY",
  "New York Rangers": "NY",
  "Philadelphia Flyers": "PA",
  "Pittsburgh Penguins": "PA",
  "San Jose Sharks": "CA",
  "Seattle Kraken": "WA",
  "St. Louis Blues": "MO",
  "Tampa Bay Lightning": "FL",
  "Vegas Golden Knights": "NV",
}

type TeamEntry = { name: string; state?: string | null; colors?: string[]; colorNames?: string[] }

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
      const { name, colors, colorNames } = team
      const state = team.state ?? TEAM_STATE_OVERRIDES[name]
      if (!state || !STATE_NAMES[state] || !colors || colors.length < 2) continue
      if (!stateMap.has(state)) stateMap.set(state, [])
      stateMap.get(state)!.push({
        name,
        league: label,
        colors: [colors[0], colors[1], colors[2] ?? "transparent"] as [string, string, string],
        ...(colorNames
          ? {
              colorNames: [colorNames[0] ?? "", colorNames[1] ?? "", colorNames[2] ?? ""] as [
                string,
                string,
                string,
              ],
            }
          : {}),
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
