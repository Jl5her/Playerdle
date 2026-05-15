#!/usr/bin/env tsx

// Resolves each MLB journey player's authoritative team history from the
// MLB Stats API (statsapi.mlb.com), normalizes franchise renames to current
// display names, and rewrites packages/data/src/journeyman/mlb-players.ts.
//
// The MLB Stats API's yearByYear stats endpoint only returns season-team rows
// where the player actually accumulated stats, so minor-league-only stints
// and signed-but-never-debuted stops are excluded by construction.

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
  mlbId?: string
}

// Map historical / pre-rebrand franchise names → current canonical names used
// in packages/data/src/playerdle/mlb/teams.json (single source of truth for
// MLB team metadata and brand colors).
const TEAM_NAME_MAP: Record<string, string> = {
  "Cleveland Indians": "Cleveland Guardians",
  "Oakland Athletics": "Athletics",
  "Tampa Bay Devil Rays": "Tampa Bay Rays",
  "Florida Marlins": "Miami Marlins",
  "Anaheim Angels": "Los Angeles Angels",
  "California Angels": "Los Angeles Angels",
  "Los Angeles Angels of Anaheim": "Los Angeles Angels",
  "Montreal Expos": "Washington Nationals",
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

async function searchMlbId(name: string): Promise<string | undefined> {
  const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`
  try {
    const data = await fetchJson<{
      people?: Array<{ id: number; fullName: string; primarySport?: { id?: number } }>
    }>(url)
    const people = (data.people ?? []).filter(
      p => !p.primarySport || p.primarySport.id === 1, // MLB sportId = 1
    )
    if (people.length === 0) return undefined
    // Bail on no exact match or ambiguous duplicates rather than silently
    // assigning the wrong MLB ID — the caller already handles undefined.
    const exact = people.filter(p => p.fullName.toLowerCase() === name.toLowerCase())
    if (exact.length !== 1) return undefined
    return String(exact[0].id)
  } catch {
    return undefined
  }
}

interface Split {
  season: number
  teamId: number
  teamName: string
}

async function fetchCareerSplits(mlbId: string): Promise<Split[] | null> {
  // Single request returns both hitting and pitching season splits when
  // group is repeated. Two-way players appear under both groups, so we dedupe
  // by (season, teamId).
  const url =
    `https://statsapi.mlb.com/api/v1/people/${mlbId}/stats` +
    `?stats=yearByYear&group=hitting&group=pitching&sportId=1`
  try {
    const data = await fetchJson<{
      stats?: Array<{
        group?: { displayName?: string }
        splits?: Array<{
          season?: string
          team?: { id?: number; name?: string }
          stat?: { gamesPlayed?: number; gamesPitched?: number }
        }>
      }>
    }>(url)

    const seen = new Set<string>()
    const splits: Split[] = []
    for (const stat of data.stats ?? []) {
      for (const split of stat.splits ?? []) {
        const season = parseInt(split.season ?? "0", 10)
        const teamId = split.team?.id
        const rawName = split.team?.name
        if (!season || !teamId || !rawName) continue
        const gp = split.stat?.gamesPlayed ?? 0
        const gpit = split.stat?.gamesPitched ?? 0
        if (gp === 0 && gpit === 0) continue
        const key = `${season}:${teamId}`
        if (seen.has(key)) continue
        seen.add(key)
        splits.push({ season, teamId, teamName: normalizeTeamName(rawName) })
      }
    }
    return splits
  } catch {
    return null
  }
}

// For seasons where the player appeared on multiple teams (mid-season trade),
// MLB Stats API returns the splits in team_id order which is NOT chronological.
// Fall back to the season's game log to determine the correct trade order via
// each team's earliest game date.
async function chronologizeSeasonSplits(
  mlbId: string,
  season: number,
  group: "hitting" | "pitching",
  splits: Split[],
): Promise<Split[]> {
  const url =
    `https://statsapi.mlb.com/api/v1/people/${mlbId}/stats` +
    `?stats=gameLog&group=${group}&season=${season}&sportId=1`
  try {
    const data = await fetchJson<{
      stats?: Array<{
        splits?: Array<{
          date?: string
          team?: { id?: number }
        }>
      }>
    }>(url)
    const firstGameByTeam = new Map<number, string>()
    for (const stat of data.stats ?? []) {
      for (const s of stat.splits ?? []) {
        const tid = s.team?.id
        const date = s.date
        if (!tid || !date) continue
        const existing = firstGameByTeam.get(tid)
        if (!existing || date < existing) firstGameByTeam.set(tid, date)
      }
    }
    if (firstGameByTeam.size === 0) return splits
    return [...splits].sort((a, b) => {
      const da = firstGameByTeam.get(a.teamId) ?? "9999-12-31"
      const db = firstGameByTeam.get(b.teamId) ?? "9999-12-31"
      return da.localeCompare(db)
    })
  } catch {
    return splits
  }
}

// Build the chronological team list. Sorts stints by season; uses the gameLog
// fallback to order mid-season trades correctly. Collapses consecutive
// identical entries while preserving genuine return stints.
async function buildTeamList(
  mlbId: string,
  position: string,
  splits: Split[],
): Promise<{ teams: string[]; multiTeamSeasons: number[] }> {
  const isPitcher = position === "SP" || position === "RP"
  const group: "hitting" | "pitching" = isPitcher ? "pitching" : "hitting"

  const bySeason = new Map<number, Split[]>()
  for (const s of splits) {
    const arr = bySeason.get(s.season) ?? []
    arr.push(s)
    bySeason.set(s.season, arr)
  }

  const ordered: Split[] = []
  const multiTeamSeasons: number[] = []
  for (const season of [...bySeason.keys()].sort((a, b) => a - b)) {
    const seasonSplits = bySeason.get(season) ?? []
    if (seasonSplits.length === 1) {
      ordered.push(seasonSplits[0])
      continue
    }
    multiTeamSeasons.push(season)
    await sleep(250)
    const sorted = await chronologizeSeasonSplits(mlbId, season, group, seasonSplits)
    ordered.push(...sorted)
  }

  const teams: string[] = []
  for (const s of ordered) {
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
  if (p.mlbId) lines.push(`${pad}mlbId: "${p.mlbId}",`)
  lines.push(`  },`)
  return lines.join("\n")
}

function generatePlayersTs(players: SyncPlayer[]): string {
  const body = players.map(playerBlock).join("\n")
  return `// Curated MLB journeymen (active or recently retired) who have played for at
// least 3 distinct MLB franchises. Team names match the CURRENT franchise
// display name in packages/data/src/playerdle/mlb/teams.json so color lookups
// resolve even when a stint predates a rebrand (e.g., Oakland → Athletics,
// Cleveland Indians → Cleveland Guardians).
//
// Generated by scripts/sync-journey-players-mlb.ts. Run \`pnpm sync:journey:mlb\`
// to refresh team lists from the MLB Stats API. Edit the players' id/name/
// position by hand; the script will preserve those fields and overwrite the
// teams[] array with the API-derived history.

import type { JourneyPlayer } from "./players"

export const MLB_JOURNEY_PLAYERS: JourneyPlayer[] = [
${body}
]

export const MLB_ELIGIBLE_POSITIONS: ReadonlyArray<string> = [
  "SP",
  "RP",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
]
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Syncing MLB journey player data with MLB Stats API...\n")

  const playersMod = await import("../packages/data/src/journeyman/mlb-players.ts")
  const players: SyncPlayer[] = (playersMod.MLB_JOURNEY_PLAYERS as SyncPlayer[]).map(p => ({
    ...p,
  }))

  // Canonical brand colors + team metadata live in playerdle/mlb/teams.json;
  // Journeyman reads from the same file via packages/data/src/journeyman/leagues.ts.
  const teamsJson = JSON.parse(
    readFileSync(resolve(DATA_ROOT, "playerdle/mlb/teams.json"), "utf-8"),
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

    if (!p.mlbId) {
      await sleep(400)
      const id = await searchMlbId(p.name)
      if (!id) {
        warnings.push(`${p.name}: MLB ID not found — skip`)
        process.stdout.write(" [id:NOT FOUND]\n")
        continue
      }
      p.mlbId = id
      idsPopulated++
      process.stdout.write(` [id:${id} search]`)
    } else {
      idsAlreadyCached++
      process.stdout.write(` [id:${p.mlbId} cached]`)
    }

    await sleep(300)
    const splits = await fetchCareerSplits(p.mlbId)
    if (!splits || splits.length === 0) {
      warnings.push(`${p.name}: career stats fetch returned no rows`)
      process.stdout.write(" [stats:none]\n")
      continue
    }

    const { teams, multiTeamSeasons } = await buildTeamList(p.mlbId, p.position, splits)
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
      process.stdout.write(` [trades:${multiTeamSeasons.join(",")}]`)
    }
    console.log()
    await sleep(200)
  }

  console.log("\n--- Sync Summary ---")
  console.log(`MLB IDs newly populated : ${idsPopulated}`)
  console.log(`MLB IDs already cached  : ${idsAlreadyCached}`)
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
      "Sync aborted: unknown team names would corrupt teams.json lookups. Add the team to playerdle/mlb/teams.json or TEAM_NAME_MAP and re-run.",
    )
  }

  const outPath = resolve(DATA_ROOT, "journeyman/mlb-players.ts")
  writeFileSync(outPath, generatePlayersTs(players), "utf-8")
  console.log(`\nWrote ${players.length} players to ${outPath}`)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
