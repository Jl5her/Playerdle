#!/usr/bin/env tsx
/**
 * Builds NBA Cap Crunch data and writes to
 * packages/data/src/capcrunch/nba-capcrunch.json
 *
 * Salary + lineup data: scraped from a publicly-hosted GitHub dataset
 *   (edwinjeon/NBA-Salary-Prediction), which is the only category of NBA data
 *   source reachable from CI (ESPN / Basketball-Reference / HoopsHype are all
 *   blocked by the network allowlist; GitHub raw is not).
 *
 *   - Salaries:  data/NBA Player Salaries_2024-25_1.csv   (Player, Team, Salary)
 *   - Positions: data/NBA Player Stats_2024-25_Per_Game.csv
 *                (Player, Team, Pos, GS, MP, ...)
 *
 *   The starting five per team is derived by taking, for each position
 *   (PG/SG/SF/PF/C), the player with the most games started (tiebreak: minutes
 *   per game). Salaries are joined by player name. This mirrors the NFL builder,
 *   which likewise selects starters from a public dataset rather than hardcoding.
 *
 *   NOTE: the upstream dataset reflects the most recently completed season
 *   (2024-25). Re-run with a newer dataset URL each offseason to refresh.
 *
 * Jersey numbers: best-effort fetch from the ESPN public roster API. This is
 *   blocked in CI (403) and degrades gracefully — numbers are omitted when the
 *   API is unreachable. Run locally on an unrestricted network to populate them.
 *
 * Usage:
 *   pnpm scrape:nba:capcrunch
 *   pnpm scrape:nba:capcrunch -- --year=2025
 *   pnpm scrape:nba:capcrunch -- --dry-run
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ---- Config ----------------------------------------------------------------

// Season the upstream dataset represents (2024-25). Override with --year.
const DEFAULT_SEASON = 2025

function parseArgs(): { year: number; dryRun: boolean } {
  const yearArg = process.argv.find(a => a.startsWith("--year="))
  const year = yearArg ? Number(yearArg.split("=")[1]) : DEFAULT_SEASON
  const dryRun = process.argv.includes("--dry-run")
  return { year, dryRun }
}

const STARTING_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const
type Position = (typeof STARTING_POSITIONS)[number]

// Team metadata keyed by Basketball-Reference abbreviation (as used by the
// upstream CSVs). Maps to our internal id + display abbr + full name.
interface TeamMeta {
  id: string
  abbr: string
  name: string
}
const TEAM_META: Record<string, TeamMeta> = {
  ATL: { id: "atl", abbr: "ATL", name: "Atlanta Hawks" },
  BOS: { id: "bos", abbr: "BOS", name: "Boston Celtics" },
  BRK: { id: "bkn", abbr: "BKN", name: "Brooklyn Nets" },
  CHO: { id: "cha", abbr: "CHA", name: "Charlotte Hornets" },
  CHI: { id: "chi", abbr: "CHI", name: "Chicago Bulls" },
  CLE: { id: "cle", abbr: "CLE", name: "Cleveland Cavaliers" },
  DAL: { id: "dal", abbr: "DAL", name: "Dallas Mavericks" },
  DEN: { id: "den", abbr: "DEN", name: "Denver Nuggets" },
  DET: { id: "det", abbr: "DET", name: "Detroit Pistons" },
  GSW: { id: "gsw", abbr: "GSW", name: "Golden State Warriors" },
  HOU: { id: "hou", abbr: "HOU", name: "Houston Rockets" },
  IND: { id: "ind", abbr: "IND", name: "Indiana Pacers" },
  LAC: { id: "lac", abbr: "LAC", name: "Los Angeles Clippers" },
  LAL: { id: "lal", abbr: "LAL", name: "Los Angeles Lakers" },
  MEM: { id: "mem", abbr: "MEM", name: "Memphis Grizzlies" },
  MIA: { id: "mia", abbr: "MIA", name: "Miami Heat" },
  MIL: { id: "mil", abbr: "MIL", name: "Milwaukee Bucks" },
  MIN: { id: "min", abbr: "MIN", name: "Minnesota Timberwolves" },
  NOP: { id: "nop", abbr: "NOP", name: "New Orleans Pelicans" },
  NYK: { id: "nyk", abbr: "NYK", name: "New York Knicks" },
  OKC: { id: "okc", abbr: "OKC", name: "Oklahoma City Thunder" },
  ORL: { id: "orl", abbr: "ORL", name: "Orlando Magic" },
  PHI: { id: "phi", abbr: "PHI", name: "Philadelphia 76ers" },
  PHO: { id: "phx", abbr: "PHX", name: "Phoenix Suns" },
  POR: { id: "por", abbr: "POR", name: "Portland Trail Blazers" },
  SAC: { id: "sac", abbr: "SAC", name: "Sacramento Kings" },
  SAS: { id: "sas", abbr: "SAS", name: "San Antonio Spurs" },
  TOR: { id: "tor", abbr: "TOR", name: "Toronto Raptors" },
  UTA: { id: "uta", abbr: "UTA", name: "Utah Jazz" },
  WAS: { id: "was", abbr: "WAS", name: "Washington Wizards" },
}

// ESPN team IDs used by the public roster API (jersey numbers, best-effort)
const ESPN_TEAM_ID: Record<string, number> = {
  atl: 1,
  bos: 2,
  bkn: 17,
  cha: 30,
  chi: 4,
  cle: 5,
  dal: 6,
  den: 7,
  det: 8,
  gsw: 9,
  hou: 10,
  ind: 11,
  lac: 12,
  lal: 13,
  mem: 29,
  mia: 14,
  mil: 15,
  min: 16,
  nop: 3,
  nyk: 18,
  okc: 25,
  orl: 19,
  phi: 20,
  phx: 21,
  por: 22,
  sac: 23,
  sas: 24,
  tor: 28,
  uta: 26,
  was: 27,
}

// ---- Upstream dataset ------------------------------------------------------

const DATA_BASE = "https://raw.githubusercontent.com/edwinjeon/NBA-Salary-Prediction/main/data"
const SALARY_CSV = "NBA Player Salaries_2024-25_1.csv"
const STATS_CSV = "NBA Player Stats_2024-25_Per_Game.csv"

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (č → c, ć → c, ş → s)
    .replace(/[,\s]+(jr\.?|sr\.?|ii|iii|iv)$/i, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Minimal CSV parser handling quoted fields (salaries are quoted: "$55,761,216 ")
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some(c => c.length > 0)) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some(c => c.length > 0)) rows.push(row)
  }
  if (rows.length === 0) return []
  const header = (rows[0] ?? []).map(h => h.replace(/^﻿/, "").trim())
  return rows.slice(1).map(cells => {
    const obj: Record<string, string> = {}
    header.forEach((key, idx) => {
      obj[key] = (cells[idx] ?? "").trim()
    })
    return obj
  })
}

async function fetchCsv(name: string): Promise<Record<string, string>[]> {
  const url = `${DATA_BASE}/${encodeURIComponent(name)}`
  const res = await fetch(url, {
    headers: { "User-Agent": "Playerdle-data-builder/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${name}`)
  return parseCsv(await res.text())
}

function parseSalary(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "")
  return digits ? Number.parseInt(digits, 10) : 0
}

// ---- Lineup derivation -----------------------------------------------------

interface StatRow {
  name: string
  pos: Position
  gs: number
  mp: number
}

interface LineupPlayer {
  name: string
  salary: number
}

/**
 * For a team's stat rows, choose a starter at each position (most games started,
 * tiebreak minutes per game). Positions with no listed player fall back to the
 * highest-minutes unused player on the roster.
 */
function deriveLineup(
  teamRows: StatRow[],
  salaryByName: Map<string, number>,
): Record<Position, LineupPlayer> | null {
  const used = new Set<string>()
  const lineup = {} as Record<Position, LineupPlayer>

  const pick = (candidates: StatRow[]): StatRow | null => {
    const available = candidates
      .filter(r => !used.has(normalizeName(r.name)))
      .sort((a, b) => b.gs - a.gs || b.mp - a.mp)
    return available[0] ?? null
  }

  for (const pos of STARTING_POSITIONS) {
    let chosen = pick(teamRows.filter(r => r.pos === pos))
    if (!chosen) {
      // Fallback: best remaining player at any position (positionless rosters).
      chosen = pick(teamRows)
    }
    if (!chosen) return null
    used.add(normalizeName(chosen.name))
    lineup[pos] = {
      name: chosen.name,
      salary: salaryByName.get(normalizeName(chosen.name)) ?? 0,
    }
  }
  return lineup
}

// ---- Jersey numbers via ESPN (best-effort) ---------------------------------

async function fetchJerseyNumbers(): Promise<Map<string, number>> {
  const jerseyMap = new Map<string, number>()
  const teamIds = Object.values(TEAM_META).map(t => t.id)
  process.stdout.write(`  Fetching jersey numbers from ESPN (${teamIds.length} teams)...\n`)

  let fetched = 0
  for (const teamId of teamIds) {
    const espnId = ESPN_TEAM_ID[teamId]
    if (!espnId) continue
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnId}/roster`
      const res = await fetch(url, {
        headers: { "User-Agent": "Playerdle-data-builder/1.0" },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) {
        console.warn(`    ⚠ ${teamId.toUpperCase()} ESPN fetch failed: HTTP ${res.status}`)
        continue
      }
      const json = (await res.json()) as {
        athletes?: Array<{ displayName?: string; jersey?: string }>
      }
      for (const athlete of json.athletes ?? []) {
        const name = athlete.displayName?.trim() ?? ""
        const jersey = Number.parseInt(athlete.jersey ?? "", 10)
        if (name && Number.isFinite(jersey)) {
          jerseyMap.set(normalizeName(name), jersey)
        }
      }
      fetched++
    } catch (err) {
      console.warn(`    ⚠ ${teamId.toUpperCase()} ESPN fetch error: ${err}`)
    }
  }

  console.log(
    `  Fetched rosters for ${fetched}/${teamIds.length} teams — ${jerseyMap.size} players with jersey numbers`,
  )
  return jerseyMap
}

// ---- Build output ----------------------------------------------------------

interface OutputPlayer {
  name: string
  salary: number
  number?: number
}
type OutputLineup = Record<Position, OutputPlayer>
interface OutputTeam {
  id: string
  name: string
  abbr: string
  lineup: OutputLineup
}
interface OutputData {
  season: string
  description: string
  teams: OutputTeam[]
}

function loadExisting(outputPath: string): OutputData | null {
  if (!existsSync(outputPath)) return null
  try {
    return JSON.parse(readFileSync(outputPath, "utf-8")) as OutputData
  } catch {
    return null
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  const { year, dryRun } = parseArgs()
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "capcrunch",
    "nba-capcrunch.json",
  )

  console.log(`NBA Cap Crunch Builder — ${year} season`)
  console.log("=".repeat(50))
  if (dryRun) console.log("DRY RUN — no file will be written\n")

  // 1. Salaries
  process.stdout.write("  Downloading salary dataset... ")
  const salaryRows = await fetchCsv(SALARY_CSV)
  const salaryByName = new Map<string, number>()
  for (const r of salaryRows) {
    const name = r.Player ?? ""
    if (!name) continue
    salaryByName.set(normalizeName(name), parseSalary(r.Salary ?? ""))
  }
  console.log(`${salaryByName.size} player salaries`)

  // 2. Per-game stats (positions + games started + minutes)
  process.stdout.write("  Downloading per-game stats... ")
  const statRows = await fetchCsv(STATS_CSV)
  const byTeam = new Map<string, StatRow[]>()
  for (const r of statRows) {
    const team = r.Team ?? ""
    if (team === "2TM" || team === "3TM" || !TEAM_META[team]) continue // skip multi-team aggregates
    const pos = r.Pos as Position
    if (!STARTING_POSITIONS.includes(pos)) continue
    const list = byTeam.get(team) ?? []
    list.push({
      name: r.Player ?? "",
      pos,
      gs: Number.parseFloat(r.GS ?? "0") || 0,
      mp: Number.parseFloat(r.MP ?? "0") || 0,
    })
    byTeam.set(team, list)
  }
  console.log(`${statRows.length} stat rows across ${byTeam.size} teams`)

  // 3. Jersey numbers (best-effort)
  let jerseyMap = new Map<string, number>()
  try {
    jerseyMap = await fetchJerseyNumbers()
  } catch (err) {
    console.warn(`  ⚠ Could not fetch ESPN rosters: ${err}`)
    console.warn("  Jersey numbers will be omitted.")
  }

  // 4. Build teams
  const existing = loadExisting(outputPath)
  const existingById = new Map(existing?.teams.map(t => [t.id, t]) ?? [])

  const teams: OutputTeam[] = []
  let built = 0
  let kept = 0
  for (const [brAbbr, meta] of Object.entries(TEAM_META)) {
    const rows = byTeam.get(brAbbr) ?? []
    const lineup = deriveLineup(rows, salaryByName)
    if (!lineup) {
      const prev = existingById.get(meta.id)
      if (prev) {
        console.warn(`  ⚠ ${meta.abbr} — keeping existing (build failed)`)
        teams.push(prev)
        kept++
      } else {
        console.warn(`  ⚠ ${meta.abbr} — skipping (no data)`)
      }
      continue
    }
    const outputLineup = {} as OutputLineup
    for (const pos of STARTING_POSITIONS) {
      const p = lineup[pos]
      const number = jerseyMap.get(normalizeName(p.name))
      outputLineup[pos] =
        number !== undefined
          ? { name: p.name, salary: p.salary, number }
          : { name: p.name, salary: p.salary }
    }
    teams.push({ id: meta.id, name: meta.name, abbr: meta.abbr, lineup: outputLineup })
    built++
  }
  teams.sort((a, b) => a.id.localeCompare(b.id))

  const withNumbers = teams
    .flatMap(t => STARTING_POSITIONS.map(p => t.lineup[p]))
    .filter(p => p.number !== undefined).length
  console.log(
    `\nBuilt ${built} teams${kept ? `, kept ${kept} from existing` : ""} — ${withNumbers} players with jersey numbers`,
  )

  if (dryRun) {
    console.log("\n--- DRY RUN (first 3 teams) ---")
    for (const t of teams.slice(0, 3)) console.log(JSON.stringify(t, null, 2))
    return
  }

  const output: OutputData = {
    season: String(year),
    description:
      "NBA starting-five salaries (annual value). Source: edwinjeon/NBA-Salary-Prediction (2024-25 salaries + per-game stats); starters derived by games started per position. Jersey numbers: ESPN public roster API (best-effort).",
    teams,
  }

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8")
  console.log(`\n✓ Wrote ${teams.length} teams to ${outputPath}`)
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
