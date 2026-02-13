#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type TargetSport = "nfl" | "mlb" | "nhl" | "nba"

interface SportTargetConfig {
  sportPath: string
  conferenceField: "conference" | "league"
  testTeamAbbr?: string
}

interface TeamMeta {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  colors?: [string, string]
}

interface GeneratedPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
  league?: string
}

const SPORT_CONFIG: Record<TargetSport, SportTargetConfig> = {
  nfl: {
    sportPath: "football/nfl",
    conferenceField: "conference",
    testTeamAbbr: "GB",
  },
  mlb: {
    sportPath: "baseball/mlb",
    conferenceField: "league",
  },
  nhl: {
    sportPath: "hockey/nhl",
    conferenceField: "conference",
  },
  nba: {
    sportPath: "basketball/nba",
    conferenceField: "conference",
  },
}

function parseArgs() {
  const sportArg = process.argv.find(arg => arg.startsWith("--sport="))
  const sportValue = sportArg?.split("=")[1] as TargetSport | "all" | undefined
  const testMode = process.argv.includes("--test")

  if (!sportValue || sportValue === "all") {
    return { sports: ["nfl", "mlb", "nhl", "nba"] as TargetSport[], testMode }
  }

  if (!(sportValue in SPORT_CONFIG)) {
    throw new Error("Invalid --sport value. Use nfl, mlb, nhl, nba, or all.")
  }

  return { sports: [sportValue as TargetSport], testMode }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json() as Promise<T>
}

function normalizeDivisionName(conferenceName: string, divisionName: string): string {
  const normalized = divisionName
    .replace(new RegExp(`^${conferenceName}\\s+`, "i"), "")
    .replace(/^American League\s+/i, "")
    .replace(/^National League\s+/i, "")
    .replace(/^Eastern\s+/i, "")
    .replace(/^Western\s+/i, "")
    .trim()

  return normalized || divisionName
}

async function fetchTeamMetadata(target: TargetSport): Promise<TeamMeta[]> {
  const { sportPath } = SPORT_CONFIG[target]
  const groupsUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/groups`
  const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams`

  const [groupsResponse, teamsResponse] = await Promise.all([
    fetchJson<{ groups?: Array<{ name?: string; abbreviation?: string; children?: Array<{ name?: string; teams?: Array<{ id?: string; displayName?: string; abbreviation?: string }> }> }> }>(groupsUrl),
    fetchJson<{ sports?: Array<{ leagues?: Array<{ teams?: Array<{ team?: { id?: string; color?: string; alternateColor?: string } }> }> }> }>(teamsUrl),
  ])

  const colorByTeamId = new Map<string, [string, string]>()
  for (const wrappedTeam of teamsResponse.sports?.[0]?.leagues?.[0]?.teams ?? []) {
    const team = wrappedTeam.team
    if (!team?.id) continue
    const primary = team.color ? `#${team.color}` : undefined
    const secondary = team.alternateColor ? `#${team.alternateColor}` : undefined
    if (primary && secondary) {
      colorByTeamId.set(team.id, [primary, secondary])
    }
  }

  const teams: TeamMeta[] = []

  for (const conference of groupsResponse.groups ?? []) {
    const conferenceName = conference.abbreviation ?? conference.name ?? ""
    for (const division of conference.children ?? []) {
      const divisionName = normalizeDivisionName(conference.name ?? conferenceName, division.name ?? "")
      for (const team of division.teams ?? []) {
        if (!team.id || !team.displayName || !team.abbreviation) continue
        teams.push({
          id: team.id,
          name: team.displayName,
          abbr: team.abbreviation.toUpperCase(),
          conference: conferenceName,
          division: divisionName,
          colors: colorByTeamId.get(team.id),
        })
      }
    }
  }

  return teams.sort((a, b) => a.name.localeCompare(b.name))
}

type RosterEntry =
  | {
      items?: Array<{ id?: string; displayName?: string; jersey?: string; position?: { abbreviation?: string } }>
    }
  | { id?: string; displayName?: string; jersey?: string; position?: { abbreviation?: string } }

function hasItemsField(value: RosterEntry): value is Extract<RosterEntry, { items?: unknown }> {
  return Object.prototype.hasOwnProperty.call(value, "items")
}

async function fetchPlayersForTeam(target: TargetSport, team: TeamMeta): Promise<GeneratedPlayer[]> {
  const { sportPath, conferenceField } = SPORT_CONFIG[target]
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${team.id}/roster`

  const data = await fetchJson<{ athletes?: RosterEntry[] }>(url)
  const normalizedAthletes: Array<{ id?: string; displayName?: string; jersey?: string; position?: { abbreviation?: string } }> = []

  for (const entry of data.athletes ?? []) {
    if (hasItemsField(entry) && Array.isArray(entry.items)) {
      normalizedAthletes.push(...entry.items)
    } else {
      normalizedAthletes.push(entry as { id?: string; displayName?: string; jersey?: string; position?: { abbreviation?: string } })
    }
  }

  const players: GeneratedPlayer[] = []

  for (const athlete of normalizedAthletes) {
    const espnId = athlete.id
    const name = athlete.displayName
    const position = athlete.position?.abbreviation
    const jerseyNumber = Number(athlete.jersey)

    if (!espnId || !name || !position || Number.isNaN(jerseyNumber)) {
      continue
    }

    const player: GeneratedPlayer = {
      id: `${target}:${espnId}`,
      name,
      conference: team.conference,
      division: team.division,
      team: team.name,
      teamAbbr: team.abbr,
      position,
      number: jerseyNumber,
    }

    if (conferenceField === "league") {
      player.league = team.conference
    }

    players.push(player)
  }

  return players
}

function dedupePlayers(players: GeneratedPlayer[]): GeneratedPlayer[] {
  const seen = new Set<string>()
  return players.filter(player => {
    if (seen.has(player.id)) return false
    seen.add(player.id)
    return true
  })
}

async function buildSportData(target: TargetSport, testMode: boolean) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputDir = resolve(__dirname, "..", "src", "data", target)
  mkdirSync(outputDir, { recursive: true })

  console.log(`\nBuilding ${target.toUpperCase()} data...`)

  let teams = await fetchTeamMetadata(target)
  if (testMode) {
    const testTeamAbbr = SPORT_CONFIG[target].testTeamAbbr
    if (!testTeamAbbr) {
      console.log(`  Test mode is only available for NFL. Skipping ${target.toUpperCase()}...`)
      return
    }

    teams = teams.filter(team => team.abbr === testTeamAbbr)
    if (teams.length === 0) {
      throw new Error(`Test team ${testTeamAbbr} not found for ${target}`)
    }
    console.log(`  TEST MODE: scraping only ${teams[0].name}`)
  } else {
    console.log(`  Loaded ${teams.length} teams`)
  }

  const allPlayers: GeneratedPlayer[] = []
  for (let i = 0; i < teams.length; i += 1) {
    const team = teams[i]
    process.stdout.write(`  [${i + 1}/${teams.length}] ${team.name}...`)
    try {
      const teamPlayers = await fetchPlayersForTeam(target, team)
      allPlayers.push(...teamPlayers)
      console.log(` ${teamPlayers.length} players`)
    } catch (error) {
      console.log(` failed (${String(error)})`)
    }
    if (i < teams.length - 1) {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 500))
    }
  }

  const players = dedupePlayers(allPlayers).sort((a, b) => a.name.localeCompare(b.name))

  const teamsPath = resolve(outputDir, "teams.json")
  const playersPath = resolve(outputDir, "players.json")
  const answerPoolPath = resolve(outputDir, "answer_pool.json")

  writeFileSync(teamsPath, `${JSON.stringify(teams, null, 2)}\n`, "utf-8")
  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(players.map(player => player.id), null, 2)}\n`, "utf-8")

  console.log(`  Wrote ${teams.length} teams to ${teamsPath}`)
  console.log(`  Wrote ${players.length} players to ${playersPath}`)
  console.log(`  Wrote ${players.length} answer pool IDs to ${answerPoolPath}`)
}

async function main() {
  const { sports, testMode } = parseArgs()
  for (const sport of sports) {
    await buildSportData(sport, testMode)
  }
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
