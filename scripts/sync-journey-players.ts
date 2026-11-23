#!/usr/bin/env tsx

// Daily sync: verifies each journey player's college and current NFL team against
// ESPN, populates espnId for future lookups, appends new team signings, removes
// consecutive duplicate team entries, records active/retired status, and
// rewrites players.ts in place.
//
// The script exits non-zero when most ESPN lookups fail, so an endpoint change
// shows up as a failed CI job instead of a silent no-op.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  applyStatus,
  currentSeasonYear,
  findOnRoster,
  loadRosterIndex,
  statusLines,
} from "./lib/journey-status"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DATA_ROOT = resolve(ROOT, "packages/data/src")

interface SyncPlayer {
  id: string
  name: string
  position: string
  college: string
  teams: string[]
  espnId?: string
  active?: boolean
  retiredYear?: number
}

// Maps historical/relocated franchise names to current canonical display names
// used in packages/data/src/playerdle/nfl/teams.json.
const TEAM_NAME_MAP: Record<string, string> = {
  "Washington Redskins": "Washington Commanders",
  "Washington Football Team": "Washington Commanders",
  "Oakland Raiders": "Las Vegas Raiders",
  "San Diego Chargers": "Los Angeles Chargers",
  "St. Louis Rams": "Los Angeles Rams",
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms))
}

// Build a name → espnId map from the current NFL players.json (active rosters).
// IDs in players.json are formatted as "nfl:XXXXXXX".
function buildRosterNameMap(): Map<string, string> {
  const path = resolve(DATA_ROOT, "playerdle/nfl/players.json")
  const players = JSON.parse(readFileSync(path, "utf-8")) as Array<{ id: string; name: string }>
  const map = new Map<string, string>()
  for (const p of players) {
    const espnId = p.id.split(":")[1]
    if (espnId) map.set(p.name.toLowerCase(), espnId)
  }
  return map
}

// Search ESPN's site search for an NFL player by name. Player results carry a
// uid like "s:20~l:28~a:3912547" — l:28 is the NFL, a: is the athlete ID.
// Returns the ESPN athlete ID string, or undefined if there's no single exact match.
async function searchEspnId(name: string): Promise<string | undefined> {
  const nameLower = name.toLowerCase()
  const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=10`

  try {
    const data = await fetchJson<{
      results?: Array<{
        type?: string
        contents?: Array<{ displayName?: string; uid?: string }>
      }>
    }>(url)

    const ids = new Set<string>()
    for (const group of data.results ?? []) {
      if (group.type !== "player") continue
      for (const item of group.contents ?? []) {
        if (item.displayName?.toLowerCase() !== nameLower) continue
        const m = item.uid?.match(/~l:28~a:(\d+)/)
        if (m) ids.add(m[1])
      }
    }
    return ids.size === 1 ? [...ids][0] : undefined
  } catch {
    return undefined
  }
}

interface AthleteProfile {
  college?: string
  currentTeam?: string
  active?: boolean
}

// Fetch an ESPN athlete profile and return college, current team and ESPN's
// active flag. (The older site.api.espn.com/apis/site/v2/.../athletes/{id}
// endpoint now returns 404.)
async function fetchAthleteProfile(espnId: string): Promise<AthleteProfile | null> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${espnId}`
  try {
    const data = await fetchJson<{
      athlete?: {
        active?: boolean
        status?: { type?: string }
        college?: { name?: string }
        team?: { displayName?: string }
      }
    }>(url)
    const a = data.athlete
    if (!a) return null
    const statusType = a.status?.type?.toLowerCase()
    return {
      college: a.college?.name,
      currentTeam: a.team?.displayName ? normalizeTeamName(a.team.displayName) : undefined,
      active:
        typeof a.active === "boolean" ? a.active : statusType ? statusType === "active" : undefined,
    }
  } catch {
    return null
  }
}

interface CareerStats {
  teams: Set<string>
  lastSeason?: number
}

// ESPN's common/v3 stats response lists season rows under
// categories[].statistics[] as { teamSlug, season: { year } }, with team
// display names in a top-level `teams` map keyed by slug.
interface EspnStatsResponse {
  teams?: Record<string, { displayName?: string }>
  categories?: Array<{
    statistics?: Array<{ teamSlug?: string; season?: { year?: number } }>
  }>
}

// Fetch the player's season-by-season stats from ESPN and return the set of
// teams they have stats entries for plus their latest season. Returns null
// when there's no data (no ESPN stats, or a network error).
async function fetchCareerStats(espnId: string): Promise<CareerStats | null> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${espnId}/stats`
  try {
    const data = await fetchJson<EspnStatsResponse>(url)
    const teams = new Set<string>()
    let lastSeason: number | undefined
    for (const cat of data.categories ?? []) {
      for (const row of cat.statistics ?? []) {
        const name = row.teamSlug ? data.teams?.[row.teamSlug]?.displayName : undefined
        if (name) teams.add(normalizeTeamName(name))
        const year = row.season?.year
        if (year && (lastSeason === undefined || year > lastSeason)) lastSeason = year
      }
    }
    return teams.size > 0 || lastSeason !== undefined ? { teams, lastSeason } : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function formatTeams(teams: string[], propIndent: number): string {
  const items = teams.map(t => `"${t}"`).join(", ")
  const oneLine = `[${items}]`
  // Biome line-width is 100; check if "    teams: [...], " fits.
  if (propIndent + "teams: ".length + oneLine.length + 1 <= 100) return oneLine
  const innerPad = " ".repeat(propIndent + 2)
  const closePad = " ".repeat(propIndent)
  return `[\n${teams.map(t => `${innerPad}"${t}",`).join("\n")}\n${closePad}]`
}

function playerBlock(p: SyncPlayer): string {
  const pad = "    " // 4-space property indent inside the array object
  const lines = [
    `  {`,
    `${pad}id: "${p.id}",`,
    `${pad}name: "${p.name}",`,
    `${pad}position: "${p.position}",`,
    `${pad}college: "${p.college}",`,
    `${pad}teams: ${formatTeams(p.teams, 4)},`,
  ]
  if (p.espnId) lines.push(`${pad}espnId: "${p.espnId}",`)
  lines.push(...statusLines(p, pad))
  lines.push(`  },`)
  return lines.join("\n")
}

function generatePlayersTs(players: SyncPlayer[]): string {
  const byPos = (pos: string | string[]) =>
    players.filter(p => (Array.isArray(pos) ? pos.includes(p.position) : p.position === pos))

  const sections = [
    ["Quarterbacks", byPos("QB")],
    ["Wide Receivers", byPos("WR")],
    ["Running Backs", byPos("RB")],
    ["Tight Ends", byPos("TE")],
    [
      "Defensive players",
      byPos(players.map(p => p.position).filter(p => !["QB", "WR", "RB", "TE"].includes(p))),
    ],
  ] as [string, SyncPlayer[]][]

  const body = sections
    .filter(([, group]) => group.length > 0)
    .map(([label, group]) => `  // ${label}\n${group.map(playerBlock).join("\n")}`)
    .join("\n\n")

  return `// Curated NFL players (active or retired in the last ~10 years) who have
// played for at least 3 NFL teams. Team names match the CURRENT franchise
// display name in packages/data/src/playerdle/nfl/teams.json (so color lookups resolve), even
// when the player's stint predates a rebrand (e.g., Oakland → Las Vegas,
// Redskins → Commanders, St. Louis Rams → Los Angeles Rams).

export interface JourneyPlayer {
  id: string
  name: string
  position: string
  college?: string
  teams: string[] // chronological: oldest stint first, current/last team last
  espnId?: string // ESPN athlete ID for direct API lookups (NFL)
  mlbId?: string // MLB Stats API person ID
  nbaId?: string // ESPN athlete ID (NBA)
  nhlId?: string // NHL API player ID
  active?: boolean // on a current roster or still listed as active by the league API
  retiredYear?: number // last season played, when retired
}

export const JOURNEY_PLAYERS: JourneyPlayer[] = [
${body}
]

export const ELIGIBLE_POSITIONS: ReadonlyArray<string> = ["QB", "WR", "RB", "TE"]
const eligibleSet = new Set(ELIGIBLE_POSITIONS)

export const ELIGIBLE_JOURNEY_PLAYERS: JourneyPlayer[] = JOURNEY_PLAYERS.filter(p =>
  eligibleSet.has(p.position),
)

export function isEligiblePosition(position: string): boolean {
  return eligibleSet.has(position)
}

export function getJourneyPlayerById(id: string): JourneyPlayer | undefined {
  return JOURNEY_PLAYERS.find(p => p.id === id)
}

export function getJourneyPlayerByName(name: string): JourneyPlayer | undefined {
  const lower = name.toLowerCase()
  return JOURNEY_PLAYERS.find(p => p.name.toLowerCase() === lower)
}
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Syncing NFL journey player data with ESPN...\n")

  // Dynamically import current players (tsx resolves TypeScript at runtime).
  const mod = await import("../packages/data/src/journeyman/players.ts")
  const players: SyncPlayer[] = (mod.JOURNEY_PLAYERS as SyncPlayer[]).map(p => ({ ...p }))

  const teamsJson = JSON.parse(
    readFileSync(resolve(DATA_ROOT, "playerdle/nfl/teams.json"), "utf-8"),
  ) as Array<{ name: string }>
  const validTeamNames = new Set(teamsJson.map(t => t.name))

  console.log("Loading active NFL roster data for ESPN ID lookup...")
  const rosterNameMap = buildRosterNameMap()
  console.log(`  ${rosterNameMap.size} active players indexed\n`)

  const rosterIndex = loadRosterIndex(DATA_ROOT, "nfl")

  let idsPopulated = 0
  let idsAlreadyCached = 0
  let teamsAdded = 0
  let dupsRemoved = 0
  let historyWarnings = 0
  let statusChanges = 0
  let lookupFailures = 0
  const warnings: string[] = []

  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    process.stdout.write(`[${i + 1}/${players.length}] ${p.name}`)

    // ── 1. Resolve ESPN ID ──────────────────────────────────────────────────
    if (!p.espnId) {
      const fromRoster = rosterNameMap.get(p.name.toLowerCase())
      if (fromRoster) {
        p.espnId = fromRoster
        idsPopulated++
        process.stdout.write(` [id:${fromRoster} roster]`)
      } else {
        await sleep(400)
        const fromSearch = await searchEspnId(p.name)
        if (fromSearch) {
          p.espnId = fromSearch
          idsPopulated++
          process.stdout.write(` [id:${fromSearch} search]`)
        } else {
          warnings.push(`${p.name}: ESPN ID not found`)
          process.stdout.write(" [id:NOT FOUND]")
        }
      }
    } else {
      idsAlreadyCached++
      process.stdout.write(` [id:${p.espnId} cached]`)
    }

    // ── 2. Fetch ESPN athlete profile + career stats ────────────────────────
    let profile: AthleteProfile | null = null
    let career: CareerStats | null = null
    if (p.espnId) {
      await sleep(300)
      profile = await fetchAthleteProfile(p.espnId)
      if (!profile) {
        lookupFailures++
        warnings.push(`${p.name}: ESPN profile fetch failed`)
        process.stdout.write(" [profile:ERROR]")
      }
      await sleep(300)
      career = await fetchCareerStats(p.espnId)
    } else {
      lookupFailures++
    }

    // ── 3. Verify college (log mismatch; do not auto-correct) ───────────────
    if (profile?.college && profile.college !== p.college) {
      warnings.push(`${p.name}: college mismatch — stored="${p.college}" ESPN="${profile.college}"`)
      process.stdout.write(` [college:mismatch]`)
    }

    // ── 4. Remove consecutive duplicate team entries ────────────────────────
    const before = p.teams.length
    p.teams = p.teams.filter((team, idx) => idx === 0 || team !== p.teams[idx - 1])
    const removed = before - p.teams.length
    if (removed > 0) {
      dupsRemoved += removed
      process.stdout.write(` [dups:-${removed}]`)
    }

    // ── 5. Validate existing team names against canonical list ──────────────
    for (const team of p.teams) {
      if (!validTeamNames.has(team)) {
        warnings.push(`${p.name}: unrecognized team name "${team}"`)
        process.stdout.write(` [team:unknown "${team}"]`)
      }
    }

    // ── 6. Current team + active/retired status ─────────────────────────────
    // The daily roster scrape is the primary signal; ESPN's profile team is a
    // fallback for players the roster index can't match. ESPN leaves retired
    // players marked active with their final team (e.g. Jared Cook, last
    // played 2021), so only trust it when they also played this season or last.
    const recentlyPlayed =
      career?.lastSeason !== undefined && career.lastSeason >= currentSeasonYear("nfl") - 1
    const rosterEntry =
      findOnRoster(rosterIndex, "nfl", p.name, p.position, p.espnId) ??
      (profile?.currentTeam && profile.active === true && recentlyPlayed
        ? { id: `nfl:${p.espnId}`, name: p.name, team: profile.currentTeam }
        : undefined)
    const status = applyStatus(p, {
      league: "nfl",
      rosterEntry,
      apiActive: profile?.active,
      lastSeasonYear: career?.lastSeason,
      validTeamNames,
      normalizeTeam: normalizeTeamName,
    })
    if (status.appendedTeam) {
      teamsAdded++
      process.stdout.write(` [team:+${status.appendedTeam}]`)
    }
    if (status.unknownTeam) {
      warnings.push(`${p.name}: current team "${status.unknownTeam}" not in teams.json — skipped`)
      process.stdout.write(` [team:unrecognized "${status.unknownTeam}"]`)
    }
    if (status.statusChanged) {
      statusChanges++
      process.stdout.write(
        ` [status:${p.active ? "active" : `retired${p.retiredYear ? ` ${p.retiredYear}` : ""}`}]`,
      )
    }

    // ── 7. Cross-check every team[] entry against ESPN career stats ──────────
    // Flags teams the player signed with but never accumulated stats for
    // (cut in preseason, spent entirely on IR, bad data entry, etc.). A team
    // appended in step 6 is expected to be missing until they play a game.
    if (career) {
      for (const team of p.teams) {
        if (!validTeamNames.has(team)) continue
        if (team === status.appendedTeam) continue
        if (!career.teams.has(team)) {
          historyWarnings++
          warnings.push(
            `${p.name}: "${team}" absent from ESPN career stats — signed but may not have played (verify and remove if inaccurate)`,
          )
          process.stdout.write(` [history:no stats "${team}"]`)
        }
      }
    }

    console.log()
    await sleep(200)
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n--- Sync Summary ---")
  console.log(`ESPN IDs newly populated : ${idsPopulated}`)
  console.log(`ESPN IDs already cached  : ${idsAlreadyCached}`)
  console.log(`ESPN lookup failures     : ${lookupFailures}`)
  console.log(`Teams added              : ${teamsAdded}`)
  console.log(`Status changes           : ${statusChanges}`)
  console.log(`Consecutive dups removed : ${dupsRemoved}`)
  console.log(`Career stats mismatches  : ${historyWarnings}`)
  console.log(`Warnings (manual review) : ${warnings.length}`)

  if (warnings.length > 0) {
    console.log("\n--- Warnings ---")
    for (const w of warnings) console.log(`  ⚠  ${w}`)
  }

  // ── Regenerate players.ts ──────────────────────────────────────────────────
  const outPath = resolve(DATA_ROOT, "journeyman/players.ts")
  writeFileSync(outPath, generatePlayersTs(players), "utf-8")
  console.log(`\nWrote ${players.length} players to ${outPath}`)

  // Roster-derived updates above are still written, but fail the job loudly
  // when ESPN is broken for most players so CI doesn't report a silent success.
  if (lookupFailures > players.length / 2) {
    console.error(
      `\n${lookupFailures}/${players.length} ESPN lookups failed — the ESPN API may have changed.`,
    )
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
