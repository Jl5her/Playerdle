#!/usr/bin/env tsx

// Resolves each NBA journey player's team history from ESPN's public web
// APIs (site.api.espn.com / site.web.api.espn.com) and rewrites
// packages/data/src/journeyman/nba-players.ts.
//
// ESPN's per-athlete stats endpoint exposes season-by-season splits that
// include the team the player played for, so signed-but-cut-in-camp and
// 10-day-without-an-appearance stints don't surface. Where the response
// doesn't yield enough (season, team) pairs to derive chronological order,
// the script falls back to verification mode and prints warnings for any
// curated stint that's absent from career stats.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  applyStatus,
  findOnRoster,
  loadRosterIndex,
  normalizeName,
  statusLines,
} from "./lib/journey-status"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DATA_ROOT = resolve(ROOT, "packages/data/src")

interface SyncPlayer {
  id: string
  name: string
  position: string
  college?: string
  teams: string[]
  nbaId?: string
  active?: boolean
  retiredYear?: number
}

// Historical / relocated franchise names → current canonical names used in
// packages/data/src/playerdle/nba/teams.json (single source of truth for NBA
// team metadata and brand colors).
const TEAM_NAME_MAP: Record<string, string> = {
  "Seattle SuperSonics": "Oklahoma City Thunder",
  "Vancouver Grizzlies": "Memphis Grizzlies",
  "Charlotte Bobcats": "Charlotte Hornets",
  "New Orleans Hornets": "New Orleans Pelicans",
  "New Orleans/Oklahoma City Hornets": "New Orleans Pelicans",
  "NO/Oklahoma City Hornets": "New Orleans Pelicans",
  "New Jersey Nets": "Brooklyn Nets",
  "Los Angeles Clippers": "LA Clippers",
}

function normalizeTeamName(name: string): string {
  // ESPN sometimes embeds line breaks in names ("NO/Oklahoma City\nHornets").
  const clean = name.replace(/\s+/g, " ").trim()
  return TEAM_NAME_MAP[clean] ?? clean
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; playerdle-journey-sync)" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms))
}

// ESPN site search. Player results carry a uid like "s:40~l:46~a:3992" —
// l:46 is the NBA, a: is the athlete ID. (The older common/v3/search endpoint
// now returns no results.)
async function searchNbaId(name: string): Promise<string | undefined> {
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
        if (!item.displayName || normalizeName(item.displayName) !== normalizeName(name)) continue
        const m = item.uid?.match(/~l:46~a:(\d+)/)
        if (m) ids.add(m[1])
      }
    }
    // Bail on no match or ambiguous duplicates rather than silently assigning
    // the wrong athlete ID — the caller already handles undefined.
    return ids.size === 1 ? [...ids][0] : undefined
  } catch {
    return undefined
  }
}

// Career evidence from ESPN: every team seen (for verification) and
// (season, team) pairs in stint order (for rebuilding the path).
interface Extraction {
  allTeams: Set<string>
  pairs: Array<{ season: number; team: string }>
}

async function fetchAthleteCollege(nbaId: string): Promise<string | undefined> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${nbaId}`
  try {
    const data = await fetchJson<{
      athlete?: { college?: { name?: string } }
    }>(url)
    return data.athlete?.college?.name ?? undefined
  } catch {
    return undefined
  }
}

// ESPN's common/v3 stats response lists season rows under
// categories[].statistics[] as { teamSlug, season: { year } } (year = season
// end year, so 2020-21 → 2021), with team display names in a top-level `teams`
// map keyed by slug. Rows within a season are in stint order. "Totals" rows
// (teamSlug like "2020-21 Totals") aren't in the teams map and are skipped.
interface EspnStatsResponse {
  teams?: Record<string, { displayName?: string }>
  categories?: Array<{
    statistics?: Array<{ teamSlug?: string; season?: { year?: number } }>
  }>
}

async function fetchCareer(nbaId: string): Promise<Extraction | null> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${nbaId}/stats`
  try {
    const data = await fetchJson<EspnStatsResponse>(url)
    const ex: Extraction = { allTeams: new Set(), pairs: [] }
    // Every category repeats the same rows; the first one is enough.
    for (const row of data.categories?.[0]?.statistics ?? []) {
      const raw = row.teamSlug ? data.teams?.[row.teamSlug]?.displayName : undefined
      const season = row.season?.year
      if (!raw || !season) continue
      const team = normalizeTeamName(raw)
      ex.allTeams.add(team)
      ex.pairs.push({ season, team })
    }
    return ex.pairs.length > 0 ? ex : null
  } catch {
    return null
  }
}

function buildTeamList(pairs: Array<{ season: number; team: string }>): string[] {
  // Stable sort by season ascending; within a season preserve insertion order.
  const indexed = pairs.map((p, i) => ({ ...p, i }))
  indexed.sort((a, b) => (a.season !== b.season ? a.season - b.season : a.i - b.i))
  // Dedupe consecutive (season,team) duplicates, then collapse consecutive
  // identical team names across season boundaries while preserving returns.
  const seasonDeduped: typeof indexed = []
  const seenKey = new Set<string>()
  for (const p of indexed) {
    const k = `${p.season}:${p.team}`
    if (seenKey.has(k)) continue
    seenKey.add(k)
    seasonDeduped.push(p)
  }
  const teams: string[] = []
  for (const p of seasonDeduped) {
    if (teams[teams.length - 1] !== p.team) teams.push(p.team)
  }
  return teams
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
  ]
  if (p.college) lines.push(`${pad}college: "${p.college}",`)
  lines.push(`${pad}teams: ${formatTeams(p.teams, 4)},`)
  if (p.nbaId) lines.push(`${pad}nbaId: "${p.nbaId}",`)
  lines.push(...statusLines(p, pad))
  lines.push(`  },`)
  return lines.join("\n")
}

function generatePlayersTs(players: SyncPlayer[]): string {
  const body = players.map(playerBlock).join("\n")
  return `// Curated NBA journeymen (active or recently retired) who have played for at
// least 3 distinct NBA franchises. Team names match the CURRENT franchise
// display name in packages/data/src/playerdle/nba/teams.json (so color lookups
// resolve even when a stint predates a rebrand: New Jersey Nets → Brooklyn,
// Charlotte Bobcats → Hornets, Seattle SuperSonics → OKC Thunder).
//
// Generated by scripts/sync-journey-players-nba.ts. Run \`pnpm sync:journey:nba\`
// to refresh team lists from ESPN. Edit the players' id/name/position/college
// by hand; the script will preserve those fields and overwrite the teams[]
// array with the API-derived history when ESPN exposes enough season-team
// detail, otherwise it leaves teams[] alone and emits warnings.

import type { JourneyPlayer } from "./players"

export const NBA_JOURNEY_PLAYERS: JourneyPlayer[] = [
${body}
]

export const NBA_ELIGIBLE_POSITIONS: ReadonlyArray<string> = ["G", "F", "PF", "C"]
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Syncing NBA journey player data with ESPN...\n")

  const playersMod = await import("../packages/data/src/journeyman/nba-players.ts")
  const players: SyncPlayer[] = (playersMod.NBA_JOURNEY_PLAYERS as SyncPlayer[]).map(p => ({
    ...p,
  }))

  const teamsJson = JSON.parse(
    readFileSync(resolve(DATA_ROOT, "playerdle/nba/teams.json"), "utf-8"),
  ) as Array<{ name: string }>
  const validTeamNames = new Set(teamsJson.map(t => t.name))

  let idsPopulated = 0
  let idsAlreadyCached = 0
  let collegesPopulated = 0
  let listsRewritten = 0
  let verifyOnly = 0
  const warnings: string[] = []
  // Blocking warnings indicate the API-derived teams[] would include a team
  // name that isn't in teams.json — writing would corrupt downstream lookups.
  const blockingWarnings: string[] = []

  const rosterIndex = loadRosterIndex(DATA_ROOT, "nba")
  let teamsAppended = 0
  let statusChanges = 0
  // Roster-based current team + active/retired status. Runs for every player,
  // including ones whose API lookup failed, and after any stats-based rewrite
  // of teams[] so a just-signed team stays at the end of the path.
  const updateStatus = (p: SyncPlayer, lastSeasonYear?: number) => {
    const status = applyStatus(p, {
      league: "nba",
      rosterEntry: findOnRoster(rosterIndex, "nba", p.name, p.position, p.nbaId),
      lastSeasonYear,
      validTeamNames,
      normalizeTeam: normalizeTeamName,
    })
    if (status.appendedTeam) {
      teamsAppended++
      process.stdout.write(` [team:+${status.appendedTeam}]`)
    }
    if (status.unknownTeam) {
      warnings.push(`${p.name}: current team "${status.unknownTeam}" not in teams.json — skipped`)
    }
    if (status.statusChanged) {
      statusChanges++
      process.stdout.write(
        ` [status:${p.active ? "active" : `retired${p.retiredYear ? ` ${p.retiredYear}` : ""}`}]`,
      )
    }
  }

  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    process.stdout.write(`[${i + 1}/${players.length}] ${p.name}`)

    if (!p.nbaId) {
      await sleep(400)
      const id = await searchNbaId(p.name)
      if (!id) {
        warnings.push(`${p.name}: NBA ESPN ID not found — skip`)
        process.stdout.write(" [id:NOT FOUND]")
        updateStatus(p)
        console.log()
        continue
      }
      p.nbaId = id
      idsPopulated++
      process.stdout.write(` [id:${id} search]`)
    } else {
      idsAlreadyCached++
      process.stdout.write(` [id:${p.nbaId} cached]`)
    }

    if (!p.college) {
      await sleep(200)
      const college = await fetchAthleteCollege(p.nbaId)
      if (college) {
        p.college = college
        collegesPopulated++
        process.stdout.write(` [college:${college}]`)
      }
    }

    await sleep(300)
    const ex = await fetchCareer(p.nbaId)
    if (!ex || (ex.pairs.length === 0 && ex.allTeams.size === 0)) {
      warnings.push(`${p.name}: career stats fetch returned no data`)
      process.stdout.write(" [stats:none]")
      updateStatus(p)
      console.log()
      continue
    }

    // Prefer auto-rewrite when we have a usable pairs sample. Heuristic:
    // need at least 3 distinct (season, team) pairs across ≥2 seasons.
    const uniqueSeasons = new Set(ex.pairs.map(p => p.season)).size
    const canRewrite = ex.pairs.length >= 3 && uniqueSeasons >= 2

    if (canRewrite) {
      const teams = buildTeamList(ex.pairs)
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
    } else {
      verifyOnly++
      process.stdout.write(` [verify-only ${ex.allTeams.size} teams seen]`)
      // Verification: every curated stint should appear in the team set.
      for (const t of p.teams) {
        if (!ex.allTeams.has(t)) {
          warnings.push(
            `${p.name}: "${t}" not in ESPN career teams — signed but may not have played; verify`,
          )
        }
      }
    }
    updateStatus(p, ex.pairs.length > 0 ? Math.max(...ex.pairs.map(x => x.season)) : undefined)
    console.log()
    await sleep(200)
  }

  console.log("\n--- Sync Summary ---")
  console.log(`Current teams appended  : ${teamsAppended}`)
  console.log(`Status changes          : ${statusChanges}`)
  console.log(`NBA IDs newly populated  : ${idsPopulated}`)
  console.log(`NBA IDs already cached   : ${idsAlreadyCached}`)
  console.log(`Colleges populated       : ${collegesPopulated}`)
  console.log(`Team lists rewritten     : ${listsRewritten}`)
  console.log(`Players in verify-only   : ${verifyOnly}`)
  console.log(`Warnings (manual review) : ${warnings.length}`)
  console.log(`Blocking warnings        : ${blockingWarnings.length}`)

  if (warnings.length > 0) {
    console.log("\n--- Warnings ---")
    for (const w of warnings) console.log(`  ⚠  ${w}`)
  }
  if (blockingWarnings.length > 0) {
    console.log("\n--- Blocking warnings ---")
    for (const w of blockingWarnings) console.log(`  ✖  ${w}`)
    throw new Error(
      "Sync aborted: unknown team names would corrupt teams.json lookups. Add the team to playerdle/nba/teams.json or TEAM_NAME_MAP and re-run.",
    )
  }

  const outPath = resolve(DATA_ROOT, "journeyman/nba-players.ts")
  writeFileSync(outPath, generatePlayersTs(players), "utf-8")
  console.log(`\nWrote ${players.length} players to ${outPath}`)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
