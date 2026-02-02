import teamsData from "./teams.json"

export interface Team {
  abbr: string
  slug: string
  name: string
  conference: "AFC" | "NFC"
  division: string
  colors: [string, string]
}

export const teams: Record<string, Team> = teamsData as unknown as Record<string, Team>

/** Look up a team by its ESPN numeric ID. */
export function getTeam(teamId: number): Team {
  const team = teams[String(teamId)]
  if (!team) throw new Error(`Unknown teamId: ${teamId}`)
  return team
}

/** Look up a team by its abbreviation (e.g., "BUF", "NE"). Case-insensitive. */
export function getTeamByAbbr(abbr: string): Team | undefined {
  const normalizedAbbr = abbr.toLowerCase()
  return Object.values(teams).find(team => team.abbr === normalizedAbbr)
}

export function getAbbrByTeamName(teamName: string): string | undefined {
  const team = Object.values(teams).find(t => t.name === teamName)
  return team?.abbr.toUpperCase()
}