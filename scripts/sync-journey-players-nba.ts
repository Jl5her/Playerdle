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
  "New Jersey Nets": "Brooklyn Nets",
  "Los Angeles Clippers": "LA Clippers",
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
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

async function searchNbaId(name: string): Promise<string | undefined> {
  const url =
    `https://site.api.espn.com/apis/common/v3/search` +
    `?query=${encodeURIComponent(name)}&sport=basketball&league=nba&limit=10`
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
    // Bail on no exact match or ambiguous duplicates rather than silently
    // assigning the wrong athlete ID — the caller already handles undefined.
    const exact = candidates.filter(a => a.displayName.toLowerCase() === name.toLowerCase())
    if (exact.length !== 1) return undefined
    return exact[0].id
  } catch {
    return undefined
  }
}

// Recursively walk an ESPN JSON response and harvest two kinds of evidence:
// (a) every team display name seen anywhere — for set-membership verification.
// (b) (season, teamName) tuples — when an object has both a recognizable
//     season indicator AND a team reference, we capture the pair for ordering.
//
// ESPN's stats response shape varies by sport/endpoint. This walker is
// permissive on purpose: it tolerates the data being one or two levels deep
// either way.
interface ExtractContext {
  currentSeason?: number
  currentTeam?: string
}

function readSeason(obj: Record<string, unknown>): number | undefined {
  const candidates = [obj.year, obj.season, obj.displayYear, obj.displayName]
  for (const c of candidates) {
    if (typeof c === "number" && c > 1900 && c < 2100) return c
    if (typeof c === "string") {
      // "2023-24" or "2024" — take the higher year (season end year).
      const m = c.match(/(\d{4})(?:[-–](\d{2,4}))?/)
      if (m) {
        const start = parseInt(m[1], 10)
        const endRaw = m[2]
        const end = endRaw
          ? endRaw.length === 2
            ? parseInt(m[1].slice(0, 2) + endRaw, 10)
            : parseInt(endRaw, 10)
          : start
        const year = Math.max(start, end)
        if (year > 1900 && year < 2100) return year
      }
    }
  }
  return undefined
}

function readTeamName(obj: Record<string, unknown>): string | undefined {
  if (obj.team && typeof obj.team === "object") {
    const t = obj.team as Record<string, unknown>
    if (typeof t.displayName === "string") return normalizeTeamName(t.displayName)
    if (typeof t.name === "string") return normalizeTeamName(t.name)
  }
  return undefined
}

interface Extraction {
  allTeams: Set<string>
  pairs: Array<{ season: number; team: string }>
}

function walk(obj: unknown, ctx: ExtractContext, out: Extraction): void {
  if (!obj || typeof obj !== "object") return
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, ctx, out)
    return
  }
  const record = obj as Record<string, unknown>

  const teamHere = readTeamName(record)
  const seasonHere = readSeason(record)
  const next: ExtractContext = { ...ctx }
  if (teamHere) {
    out.allTeams.add(teamHere)
    next.currentTeam = teamHere
  }
  if (seasonHere) next.currentSeason = seasonHere

  if (next.currentSeason && next.currentTeam) {
    out.pairs.push({ season: next.currentSeason, team: next.currentTeam })
  }

  for (const v of Object.values(record)) walk(v, next, out)
}

async function fetchAthleteCollege(nbaId: string): Promise<string | undefined> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${nbaId}`
  try {
    const data = await fetchJson<{
      athlete?: { college?: { name?: string } }
    }>(url)
    return data.athlete?.college?.name ?? undefined
  } catch {
    return undefined
  }
}

async function fetchCareer(nbaId: string): Promise<Extraction | null> {
  const urls = [
    `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${nbaId}/stats`,
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${nbaId}/stats`,
  ]
  for (const url of urls) {
    try {
      const data = await fetchJson<unknown>(url)
      const ex: Extraction = { allTeams: new Set(), pairs: [] }
      walk(data, {}, ex)
      if (ex.pairs.length > 0 || ex.allTeams.size > 0) return ex
    } catch {
      /* try next endpoint */
    }
    await sleep(200)
  }
  return null
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

  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    process.stdout.write(`[${i + 1}/${players.length}] ${p.name}`)

    if (!p.nbaId) {
      await sleep(400)
      const id = await searchNbaId(p.name)
      if (!id) {
        warnings.push(`${p.name}: NBA ESPN ID not found — skip`)
        process.stdout.write(" [id:NOT FOUND]\n")
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
      process.stdout.write(" [stats:none]\n")
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
    console.log()
    await sleep(200)
  }

  console.log("\n--- Sync Summary ---")
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
