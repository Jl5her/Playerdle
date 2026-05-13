#!/usr/bin/env tsx

// Daily sync: verifies each journey player's college and current NFL team against
// ESPN, populates espnId for future lookups, appends new team signings, removes
// consecutive duplicate team entries, and rewrites players.ts in place.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

interface SyncPlayer {
  id: string
  name: string
  position: string
  college: string
  teams: string[]
  espnId?: string
}

// Maps historical/relocated franchise names to current canonical display names
// used in src/data/nfl/teams.json.
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
  const path = resolve(ROOT, "src/data/nfl/players.json")
  const players = JSON.parse(readFileSync(path, "utf-8")) as Array<{ id: string; name: string }>
  const map = new Map<string, string>()
  for (const p of players) {
    const espnId = p.id.split(":")[1]
    if (espnId) map.set(p.name.toLowerCase(), espnId)
  }
  return map
}

// Search ESPN's common search API for a player by name.
// Returns the ESPN athlete ID string, or undefined if not found.
async function searchEspnId(name: string): Promise<string | undefined> {
  const nameLower = name.toLowerCase()
  const encoded = encodeURIComponent(name)
  const url = `https://site.api.espn.com/apis/common/v3/search?query=${encoded}&sport=football&league=nfl&limit=5`

  try {
    const data = await fetchJson<{
      results?: Array<{
        contents?: Array<{
          id?: string
          data?: {
            athletes?: Array<{ id?: string; displayName?: string }>
            athlete?: { id?: string; displayName?: string }
          }
        }>
      }>
    }>(url)

    const candidates: Array<{ id: string; displayName: string }> = []

    for (const group of data.results ?? []) {
      for (const item of group.contents ?? []) {
        const athletes = [
          ...(item.data?.athletes ?? []),
          ...(item.data?.athlete ? [item.data.athlete] : []),
        ]
        for (const a of athletes) {
          if (a.id && a.displayName) candidates.push({ id: a.id, displayName: a.displayName })
        }
      }
    }

    // Prefer exact display-name match; fall back to first candidate.
    const exact = candidates.find(a => a.displayName.toLowerCase() === nameLower)
    return exact?.id ?? candidates[0]?.id
  } catch {
    return undefined
  }
}

interface AthleteProfile {
  college?: string
  currentTeam?: string
}

// Fetch an ESPN athlete profile and return college + current team (if active).
async function fetchAthleteProfile(espnId: string): Promise<AthleteProfile | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${espnId}`
  try {
    const data = await fetchJson<{
      athlete?: {
        college?: { name?: string }
        team?: { displayName?: string }
      }
    }>(url)
    const a = data.athlete
    if (!a) return null
    return {
      college: a.college?.name,
      currentTeam: a.team?.displayName ? normalizeTeamName(a.team.displayName) : undefined,
    }
  } catch {
    return null
  }
}

// Recursively walk an ESPN JSON response and collect every team.displayName
// encountered. Works regardless of which nested structure the stats endpoint
// returns for a given player.
function extractTeamNames(obj: unknown, out: Set<string>): void {
  if (!obj || typeof obj !== "object") return
  if (Array.isArray(obj)) {
    for (const item of obj) extractTeamNames(item, out)
    return
  }
  const record = obj as Record<string, unknown>
  if (record.team && typeof record.team === "object") {
    const t = record.team as Record<string, unknown>
    if (typeof t.displayName === "string") out.add(normalizeTeamName(t.displayName))
  }
  for (const v of Object.values(record)) extractTeamNames(v, out)
}

// Fetch the player's season-by-season stats from ESPN and return the set of
// teams they have stats entries for. Returns null when the endpoint has no
// data (retired players with no ESPN stats, or a network error).
async function fetchCareerTeams(espnId: string): Promise<Set<string> | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${espnId}/stats`
  try {
    const data = await fetchJson<unknown>(url)
    const teams = new Set<string>()
    extractTeamNames(data, teams)
    return teams.size > 0 ? teams : null
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
    ["Defensive players", byPos(players.map(p => p.position).filter(p => !["QB", "WR", "RB", "TE"].includes(p)))],
  ] as [string, SyncPlayer[]][]

  const body = sections
    .filter(([, group]) => group.length > 0)
    .map(([label, group]) => `  // ${label}\n${group.map(playerBlock).join("\n")}`)
    .join("\n\n")

  return `// Curated NFL players (active or retired in the last ~10 years) who have
// played for at least 3 NFL teams. Team names match the CURRENT franchise
// display name in src/data/nfl/teams.json (so color lookups resolve), even
// when the player's stint predates a rebrand (e.g., Oakland → Las Vegas,
// Redskins → Commanders, St. Louis Rams → Los Angeles Rams).

export interface JourneyPlayer {
  id: string
  name: string
  position: string
  college: string
  teams: string[] // chronological: oldest stint first, current/last team last
  espnId?: string // ESPN athlete ID for direct API lookups
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
  const mod = await import("../src/games/journeyman/data/journey/players.ts")
  const players: SyncPlayer[] = (mod.JOURNEY_PLAYERS as SyncPlayer[]).map(p => ({ ...p }))

  const teamsJson = JSON.parse(
    readFileSync(resolve(ROOT, "src/data/nfl/teams.json"), "utf-8"),
  ) as Array<{ name: string }>
  const validTeamNames = new Set(teamsJson.map(t => t.name))

  console.log("Loading active NFL roster data for ESPN ID lookup...")
  const rosterNameMap = buildRosterNameMap()
  console.log(`  ${rosterNameMap.size} active players indexed\n`)

  let idsPopulated = 0
  let idsAlreadyCached = 0
  let teamsAdded = 0
  let dupsRemoved = 0
  let historyWarnings = 0
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
          warnings.push(`${p.name}: ESPN ID not found — skip`)
          process.stdout.write(" [id:NOT FOUND]\n")
          continue
        }
      }
    } else {
      idsAlreadyCached++
      process.stdout.write(` [id:${p.espnId} cached]`)
    }

    // ── 2. Fetch ESPN athlete profile ───────────────────────────────────────
    await sleep(300)
    const profile = await fetchAthleteProfile(p.espnId)

    if (!profile) {
      warnings.push(`${p.name}: ESPN profile fetch failed`)
      process.stdout.write(" [profile:ERROR]\n")
      continue
    }

    // ── 3. Verify college (log mismatch; do not auto-correct) ───────────────
    if (profile.college && profile.college !== p.college) {
      warnings.push(
        `${p.name}: college mismatch — stored="${p.college}" ESPN="${profile.college}"`,
      )
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

    // ── 6. Append new current team if player has moved ──────────────────────
    if (profile.currentTeam) {
      const lastTeam = p.teams[p.teams.length - 1]
      if (profile.currentTeam !== lastTeam) {
        if (validTeamNames.has(profile.currentTeam)) {
          p.teams.push(profile.currentTeam)
          teamsAdded++
          process.stdout.write(` [team:+${profile.currentTeam}]`)
        } else {
          warnings.push(
            `${p.name}: ESPN reports unknown team "${profile.currentTeam}" — skipped`,
          )
          process.stdout.write(` [team:unrecognized "${profile.currentTeam}"]`)
        }
      }
    }
    // No currentTeam → player is retired or a free agent; leave teams[] as-is.

    // ── 7. Cross-check every team[] entry against ESPN career stats ──────────
    // Flags teams the player signed with but never accumulated stats for
    // (cut in preseason, spent entirely on IR, bad data entry, etc.).
    await sleep(300)
    const careerTeams = await fetchCareerTeams(p.espnId)

    if (careerTeams) {
      for (const team of p.teams) {
        // Skip teams already flagged as unrecognized in step 5.
        if (!validTeamNames.has(team)) continue
        if (!careerTeams.has(team)) {
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
  console.log(`Teams added              : ${teamsAdded}`)
  console.log(`Consecutive dups removed : ${dupsRemoved}`)
  console.log(`Career stats mismatches  : ${historyWarnings}`)
  console.log(`Warnings (manual review) : ${warnings.length}`)

  if (warnings.length > 0) {
    console.log("\n--- Warnings ---")
    for (const w of warnings) console.log(`  ⚠  ${w}`)
  }

  // ── Regenerate players.ts ──────────────────────────────────────────────────
  const outPath = resolve(ROOT, "src/data/journey/players.ts")
  writeFileSync(outPath, generatePlayersTs(players), "utf-8")
  console.log(`\nWrote ${players.length} players to ${outPath}`)

  if (warnings.length > 0) {
    process.exitCode = 0 // warnings don't fail the job; CI log captures them
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
