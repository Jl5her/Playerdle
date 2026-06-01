#!/usr/bin/env tsx

// Resolves each NHL journey player's authoritative team history from the
// official NHL API (api-web.nhle.com) and rewrites
// packages/data/src/journeyman/nhl-players.ts.
//
// The /v1/player/{id}/landing endpoint exposes seasonTotals with explicit
// leagueAbbrev/gameTypeId/gamesPlayed fields, so AHL conditioning stints and
// signed-but-never-debuted moves are filtered out by construction.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DATA_ROOT = resolve(ROOT, "packages/data/src")

interface SyncPlayer {
  id: string
  name: string
  position: string
  teams: string[]
  nhlId?: string
}

// Historical / relocated franchise names → current canonical names used in
// packages/data/src/playerdle/nhl/teams.json (single source of truth for NHL
// team metadata and brand colors).
const TEAM_NAME_MAP: Record<string, string> = {
  "Phoenix Coyotes": "Utah Mammoth",
  "Arizona Coyotes": "Utah Mammoth",
  "Utah Hockey Club": "Utah Mammoth",
  "Atlanta Thrashers": "Winnipeg Jets",
  "Mighty Ducks of Anaheim": "Anaheim Ducks",
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "playerdle-journey-sync" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms))
}

async function searchNhlId(name: string): Promise<string | undefined> {
  const url =
    `https://search.d3.nhle.com/api/v1/search/player` +
    `?culture=en-us&limit=10&q=${encodeURIComponent(name)}&active=null`
  try {
    const data =
      await fetchJson<Array<{ playerId: string | number; name?: string; lastTeamId?: string }>>(url)
    if (!Array.isArray(data) || data.length === 0) return undefined
    // Bail on no exact match or ambiguous duplicates rather than silently
    // assigning the wrong player ID — the caller already handles undefined.
    const exact = data.filter(p => p.name?.toLowerCase() === name.toLowerCase())
    if (exact.length !== 1) return undefined
    return String(exact[0].playerId)
  } catch {
    return undefined
  }
}

interface Stint {
  season: number // YYYYYYYY (start year + end year, NHL API format)
  teamName: string
}

async function fetchCareerStints(nhlId: string): Promise<Stint[] | null> {
  const url = `https://api-web.nhle.com/v1/player/${nhlId}/landing`
  try {
    const data = await fetchJson<{
      seasonTotals?: Array<{
        season?: number
        gameTypeId?: number // 2 = regular season
        leagueAbbrev?: string
        teamName?: { default?: string }
        gamesPlayed?: number
      }>
    }>(url)

    const stints: Stint[] = []
    const seen = new Set<string>()
    for (const row of data.seasonTotals ?? []) {
      if (row.leagueAbbrev !== "NHL") continue // Skip AHL / juniors / KHL etc.
      if (row.gameTypeId !== 2) continue // Skip playoffs (would duplicate teams)
      if ((row.gamesPlayed ?? 0) <= 0) continue
      const season = row.season
      const rawName = row.teamName?.default
      if (!season || !rawName) continue
      const teamName = normalizeTeamName(rawName)
      const key = `${season}:${teamName}`
      if (seen.has(key)) continue
      seen.add(key)
      stints.push({ season, teamName })
    }
    return stints
  } catch {
    return null
  }
}

// Build the chronological team list. Sorts by season number directly so we
// don't rely on the API's (undocumented) seasonTotals order; within a season
// the NHL API typically lists rows in transaction order, which we preserve
// via the stable index. Collapses consecutive duplicates while preserving
// genuine return stints.
function buildTeamList(stints: Stint[]): { teams: string[]; multiTeamSeasons: number[] } {
  const sorted = stints
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => (a.season !== b.season ? a.season - b.season : a.i - b.i))

  const seasonTeams = new Map<number, Set<string>>()
  for (const s of sorted) {
    const set = seasonTeams.get(s.season) ?? new Set<string>()
    set.add(s.teamName)
    seasonTeams.set(s.season, set)
  }
  const multiTeamSeasons = Array.from(seasonTeams.entries())
    .filter(([, set]) => set.size > 1)
    .map(([season]) => season)

  const teams: string[] = []
  for (const s of sorted) {
    if (teams[teams.length - 1] !== s.teamName) teams.push(s.teamName)
  }
  return { teams, multiTeamSeasons }
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function formatTeams(teams: string[], propIndent: number): string {
  const items = teams.map(t => `"${t}"`).join(", ")
  const oneLine = `[${items}]`
  if (propIndent + "teams: ".length + oneLine.length + 1 <= 100) return oneLine
  const innerPad = " ".repeat(propIndent + 2)
  const closePad = " ".repeat(propIndent)
  return `[\n${teams.map(t => `${innerPad}"${t}",`).join("\n")}\n${closePad}]`
}

function playerBlock(p: SyncPlayer): string {
  const pad = "    "
  const lines = [
    `  {`,
    `${pad}id: "${p.id}",`,
    `${pad}name: "${p.name}",`,
    `${pad}position: "${p.position}",`,
    `${pad}teams: ${formatTeams(p.teams, 4)},`,
  ]
  if (p.nhlId) lines.push(`${pad}nhlId: "${p.nhlId}",`)
  lines.push(`  },`)
  return lines.join("\n")
}

function generatePlayersTs(players: SyncPlayer[]): string {
  const body = players.map(playerBlock).join("\n")
  return `// Curated NHL journeymen (active or recently retired) who have played for at
// least 3 distinct NHL franchises. Team names match the CURRENT franchise
// display name in packages/data/src/playerdle/nhl/teams.json (so color lookups
// resolve even when a stint predates a rebrand: Phoenix/Arizona → Utah Mammoth,
// Atlanta Thrashers → Winnipeg Jets).
//
// Generated by scripts/sync-journey-players-nhl.ts. Run \`pnpm sync:journey:nhl\`
// to refresh team lists from the official NHL API (api-web.nhle.com). Edit
// the players' id/name/position by hand; the script will preserve those fields
// and overwrite the teams[] array with the API-derived history.

import type { JourneyPlayer } from "./players"

export const NHL_JOURNEY_PLAYERS: JourneyPlayer[] = [
${body}
]

export const NHL_ELIGIBLE_POSITIONS: ReadonlyArray<string> = ["C", "LW", "RW", "D", "G"]
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Syncing NHL journey player data with api-web.nhle.com...\n")

  const playersMod = await import("../packages/data/src/journeyman/nhl-players.ts")
  const players: SyncPlayer[] = (playersMod.NHL_JOURNEY_PLAYERS as SyncPlayer[]).map(p => ({
    ...p,
  }))

  const teamsJson = JSON.parse(
    readFileSync(resolve(DATA_ROOT, "playerdle/nhl/teams.json"), "utf-8"),
  ) as Array<{ name: string }>
  const validTeamNames = new Set(teamsJson.map(t => t.name))

  let idsPopulated = 0
  let idsAlreadyCached = 0
  let listsRewritten = 0
  let multiTeamSeasonCount = 0
  const warnings: string[] = []
  // Blocking warnings indicate the API-derived teams[] would include a team
  // name that isn't in teams.json — writing would corrupt downstream lookups.
  const blockingWarnings: string[] = []

  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    process.stdout.write(`[${i + 1}/${players.length}] ${p.name}`)

    if (!p.nhlId) {
      await sleep(400)
      const id = await searchNhlId(p.name)
      if (!id) {
        warnings.push(`${p.name}: NHL ID not found — skip`)
        process.stdout.write(" [id:NOT FOUND]\n")
        continue
      }
      p.nhlId = id
      idsPopulated++
      process.stdout.write(` [id:${id} search]`)
    } else {
      idsAlreadyCached++
      process.stdout.write(` [id:${p.nhlId} cached]`)
    }

    await sleep(300)
    const stints = await fetchCareerStints(p.nhlId)
    if (!stints || stints.length === 0) {
      warnings.push(`${p.name}: career stats returned no NHL rows`)
      process.stdout.write(" [stats:none]\n")
      continue
    }

    const { teams, multiTeamSeasons } = buildTeamList(stints)
    multiTeamSeasonCount += multiTeamSeasons.length

    for (const t of teams) {
      if (!validTeamNames.has(t)) {
        blockingWarnings.push(`${p.name}: unknown team "${t}" — add to palette or map`)
      }
    }

    const before = JSON.stringify(p.teams)
    const after = JSON.stringify(teams)
    if (before !== after) {
      listsRewritten++
      process.stdout.write(` [teams:CHANGED ${p.teams.length}→${teams.length}]`)
      p.teams = teams
    } else {
      process.stdout.write(` [teams:ok]`)
    }
    if (multiTeamSeasons.length > 0) {
      process.stdout.write(` [trades:${multiTeamSeasons.length}]`)
    }
    console.log()
    await sleep(200)
  }

  console.log("\n--- Sync Summary ---")
  console.log(`NHL IDs newly populated : ${idsPopulated}`)
  console.log(`NHL IDs already cached  : ${idsAlreadyCached}`)
  console.log(`Team lists rewritten    : ${listsRewritten}`)
  console.log(`Mid-season trades       : ${multiTeamSeasonCount}`)
  console.log(`Warnings (manual review): ${warnings.length}`)
  console.log(`Blocking warnings       : ${blockingWarnings.length}`)

  if (warnings.length > 0) {
    console.log("\n--- Warnings ---")
    for (const w of warnings) console.log(`  ⚠  ${w}`)
  }
  if (blockingWarnings.length > 0) {
    console.log("\n--- Blocking warnings ---")
    for (const w of blockingWarnings) console.log(`  ✖  ${w}`)
    throw new Error(
      "Sync aborted: unknown team names would corrupt teams.json lookups. Add the team to playerdle/nhl/teams.json or TEAM_NAME_MAP and re-run.",
    )
  }

  const outPath = resolve(DATA_ROOT, "journeyman/nhl-players.ts")
  writeFileSync(outPath, generatePlayersTs(players), "utf-8")
  console.log(`\nWrote ${players.length} players to ${outPath}`)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
