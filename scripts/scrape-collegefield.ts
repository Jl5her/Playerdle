#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, "..", "packages", "data", "src", "collegecourt")

interface CollegeColors {
  abbr: string
  colors: [string, string]
}

interface CollegeStarter {
  name: string
  school: string
  schoolAbbr: string
  colors: [string, string]
}

type Position = "QB" | "RB" | "TE" | "WR1" | "WR2" | "WR3"

interface CollegeFieldTeam {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  starters: Record<Position, CollegeStarter>
}

interface CollegeFieldData {
  season: string
  teams: CollegeFieldTeam[]
}

// ESPN API types
interface EspnGroupsResponse {
  groups?: Array<{
    name?: string
    abbreviation?: string
    children?: Array<{
      name?: string
      teams?: Array<{ id?: string; displayName?: string; abbreviation?: string }>
    }>
  }>
}

interface EspnTeamInfo {
  id: string
  abbr: string
  name: string
  conference: string
  division: string
}

interface EspnDepthAthlete {
  id?: string
  displayName?: string
  college?: { name?: string; shortName?: string }
}

interface EspnDepthEntry {
  rank?: number
  athlete?: EspnDepthAthlete
}

interface EspnDepthPosition {
  position?: { abbreviation?: string; name?: string }
  athletes?: EspnDepthEntry[]
}

interface EspnDepthChartResponse {
  items?: EspnDepthPosition[]
}

interface EspnAthleteResponse {
  id?: string
  displayName?: string
  college?: { name?: string; shortName?: string; abbreviation?: string }
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

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeDivisionName(conferenceName: string, divisionName: string): string {
  return (
    divisionName
      .replace(new RegExp(`^${conferenceName}\\s+`, "i"), "")
      .replace(/^American League\s+/i, "")
      .replace(/^National League\s+/i, "")
      .trim() || divisionName
  )
}

async function fetchNflTeams(): Promise<EspnTeamInfo[]> {
  const data = await fetchJson<EspnGroupsResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/groups",
  )
  const teams: EspnTeamInfo[] = []

  for (const conference of data.groups ?? []) {
    const confName = conference.abbreviation ?? conference.name ?? ""
    for (const division of conference.children ?? []) {
      const divName = normalizeDivisionName(conference.name ?? confName, division.name ?? "")
      for (const team of division.teams ?? []) {
        if (!team.id || !team.displayName || !team.abbreviation) continue
        teams.push({
          id: team.id,
          abbr: team.abbreviation.toUpperCase(),
          name: team.displayName,
          conference: confName,
          division: divName,
        })
      }
    }
  }

  return teams.sort((a, b) => a.name.localeCompare(b.name))
}

async function fetchDepthChart(teamId: string): Promise<EspnDepthChartResponse> {
  return fetchJson<EspnDepthChartResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/depthchart`,
  )
}

async function fetchAthleteFull(athleteId: string): Promise<EspnAthleteResponse | null> {
  try {
    return await fetchJson<EspnAthleteResponse>(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${athleteId}`,
    )
  } catch {
    return null
  }
}

function isWrPosition(pos: EspnDepthPosition): boolean {
  const abbr = pos.position?.abbreviation?.toUpperCase() ?? ""
  const name = pos.position?.name?.toLowerCase() ?? ""
  return abbr === "WR" || name.includes("wide receiver") || abbr === "SE" || abbr === "FL"
}

function lookupCollege(
  schoolName: string,
  colorMap: Record<string, CollegeColors>,
): CollegeColors | null {
  if (colorMap[schoolName]) return colorMap[schoolName]

  const lower = schoolName.toLowerCase().trim()
  for (const [key, val] of Object.entries(colorMap)) {
    if (key.toLowerCase() === lower) return val
  }

  for (const [key, val] of Object.entries(colorMap)) {
    const keyLower = key.toLowerCase()
    if (lower.includes(keyLower) || keyLower.includes(lower)) return val
  }

  return null
}

function getCurrentNflSeason(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // After the Super Bowl (February), we're planning for the next season
  const seasonYear = month >= 3 ? year : year - 1
  return `${seasonYear}-${String(seasonYear + 1).slice(2)}`
}

// Neutral colors used when a new starter's school can't be matched to the
// color map. The render falls back to a colored badge with the abbreviation,
// so the player still shows up (flagged for manual fixup) instead of being
// dropped — which would silently revert the slot to the previous starter.
const PLACEHOLDER_COLORS: [string, string] = ["#6B7280", "#FFFFFF"]

// Best-effort abbreviation for an unmapped school (e.g. "Sam Houston" -> "SH",
// "Incarnate Word" -> "IW"). Only used as a visible placeholder until the
// school is added to college-colors.json / college-logos.ts.
function deriveSchoolAbbr(college: string): string {
  const words = college
    .replace(/[().]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length >= 2) {
    return words
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4)
  }
  return college.slice(0, 4).toUpperCase()
}

type StarterResolution =
  | { status: "ok"; starter: CollegeStarter }
  | { status: "no-college"; name: string }
  | { status: "unknown-school"; name: string; college: string }

// Resolve a depth-chart entry into a starter. Returns null only when the entry
// has no usable athlete at all; otherwise the athlete name is always preserved
// so the caller can keep the roster current even when colors can't be matched.
async function resolveStarter(
  entry: EspnDepthEntry,
  colorMap: Record<string, CollegeColors>,
): Promise<StarterResolution | null> {
  const athlete = entry.athlete
  if (!athlete?.id || !athlete.displayName) return null

  const name = athlete.displayName
  let collegeName = athlete.college?.name ?? athlete.college?.shortName

  if (!collegeName) {
    await delay(150)
    const full = await fetchAthleteFull(athlete.id)
    collegeName =
      full?.college?.name ?? full?.college?.shortName ?? full?.college?.abbreviation ?? null
  }

  if (!collegeName) return { status: "no-college", name }

  const colors = lookupCollege(collegeName, colorMap)
  if (!colors) return { status: "unknown-school", name, college: collegeName }

  return {
    status: "ok",
    starter: {
      name,
      school: collegeName,
      schoolAbbr: colors.abbr,
      colors: colors.colors,
    },
  }
}

async function buildStarters(
  depthChart: EspnDepthChartResponse,
  existing: CollegeFieldTeam | undefined,
  colorMap: Record<string, CollegeColors>,
): Promise<Record<Position, CollegeStarter>> {
  const items = depthChart.items ?? []

  const qbEntries = items
    .filter(p => p.position?.abbreviation?.toUpperCase() === "QB")
    .flatMap(p => p.athletes ?? [])

  const rbEntries = items
    .filter(p => p.position?.abbreviation?.toUpperCase() === "RB")
    .flatMap(p => p.athletes ?? [])

  const teEntries = items
    .filter(p => p.position?.abbreviation?.toUpperCase() === "TE")
    .flatMap(p => p.athletes ?? [])

  // Combine all WR-type entries and sort by rank
  const wrEntries = items
    .filter(isWrPosition)
    .flatMap(p => p.athletes ?? [])
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  // Deduplicate WRs by athlete ID (player may appear in multiple groups)
  const seenWrIds = new Set<string>()
  const dedupedWrs = wrEntries.filter(e => {
    if (!e.athlete?.id) return true
    if (seenWrIds.has(e.athlete.id)) return false
    seenWrIds.add(e.athlete.id)
    return true
  })

  const top: { key: Position; entry: EspnDepthEntry | undefined; fallback: CollegeStarter | undefined }[] = [
    { key: "QB", entry: qbEntries.find(e => e.rank === 1) ?? qbEntries[0], fallback: existing?.starters.QB },
    { key: "RB", entry: rbEntries.find(e => e.rank === 1) ?? rbEntries[0], fallback: existing?.starters.RB },
    { key: "TE", entry: teEntries.find(e => e.rank === 1) ?? teEntries[0], fallback: existing?.starters.TE },
    { key: "WR1", entry: dedupedWrs[0], fallback: existing?.starters.WR1 },
    { key: "WR2", entry: dedupedWrs[1], fallback: existing?.starters.WR2 },
    { key: "WR3", entry: dedupedWrs[2], fallback: existing?.starters.WR3 },
  ]

  const starters: Partial<Record<Position, CollegeStarter>> = {}

  for (const { key, entry, fallback } of top) {
    const resolution = entry ? await resolveStarter(entry, colorMap) : null

    // Fully resolved from ESPN — use it.
    if (resolution?.status === "ok") {
      starters[key] = resolution.starter
      continue
    }

    // ESPN reported a starter we couldn't fully resolve (unknown/unmatched
    // school). Do NOT silently revert to the previous starter — that masks
    // roster changes and leaves stale players (e.g. an outdated QB1).
    if (resolution) {
      const { name } = resolution

      // Unchanged starter: keep the existing, fully-resolved record.
      if (fallback?.name === name) {
        starters[key] = fallback
        continue
      }

      // Genuinely new/changed starter we can't color-match. Record the player
      // anyway with placeholder colors so the roster stays current, and warn
      // loudly so the school can be added to the color/logo maps.
      const college = resolution.status === "unknown-school" ? resolution.college : "Unknown"
      console.warn(
        `    ⚠️  ${key}: "${name}" (${college}) not in color map — recorded with ` +
          `placeholder colors. Add this school to college-colors.json and college-logos.ts.`,
      )
      starters[key] = {
        name,
        school: college,
        schoolAbbr: deriveSchoolAbbr(college),
        colors: PLACEHOLDER_COLORS,
      }
      continue
    }

    // No ESPN entry at all for this position — keep existing data if available.
    if (fallback) {
      starters[key] = fallback
    } else {
      throw new Error(`No data available for position ${key}`)
    }
  }

  return starters as Record<Position, CollegeStarter>
}

async function main() {
  const colorMapPath = resolve(DATA_DIR, "college-colors.json")
  const outputPath = resolve(DATA_DIR, "nfl-college-field.json")

  if (!existsSync(colorMapPath)) {
    console.error(`Missing: ${colorMapPath}`)
    process.exit(1)
  }

  const colorMap = JSON.parse(readFileSync(colorMapPath, "utf-8")) as Record<string, CollegeColors>

  const existingData: CollegeFieldData = existsSync(outputPath)
    ? (JSON.parse(readFileSync(outputPath, "utf-8")) as CollegeFieldData)
    : { season: getCurrentNflSeason(), teams: [] }

  const existingByAbbr = new Map(existingData.teams.map(t => [t.abbr, t]))

  console.log("Fetching NFL teams...")
  const teams = await fetchNflTeams()
  console.log(`Found ${teams.length} teams\n`)

  const updatedTeams: CollegeFieldTeam[] = []

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    process.stdout.write(`[${i + 1}/${teams.length}] ${team.name}... `)

    try {
      const depthChart = await fetchDepthChart(team.id)
      const starters = await buildStarters(depthChart, existingByAbbr.get(team.abbr), colorMap)

      updatedTeams.push({
        id: team.abbr,
        name: team.name,
        abbr: team.abbr,
        conference: team.conference,
        division: team.division,
        starters,
      })

      // Report starters summary
      console.log(
        `QB: ${starters.QB.name} | RB: ${starters.RB.name} | TE: ${starters.TE.name}`,
      )
    } catch (error) {
      console.log(`FAILED: ${String(error)}`)
      const existing = existingByAbbr.get(team.abbr)
      if (existing) {
        updatedTeams.push(existing)
        console.log(`  → Kept existing data`)
      } else {
        console.log(`  → No fallback data available`)
      }
    }

    if (i < teams.length - 1) {
      await delay(500)
    }
  }

  updatedTeams.sort((a, b) => a.name.localeCompare(b.name))

  const output: CollegeFieldData = {
    season: getCurrentNflSeason(),
    teams: updatedTeams,
  }

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8")
  console.log(`\nWrote ${updatedTeams.length} teams to ${outputPath}`)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
