#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

interface NbaPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
}

interface TwoKRatingsRow {
  playerName: string
  teamAbbr: string
  ovr: number
  out: number
  ath: number
  ply: number
  def: number
}

interface Nba2kPlayer extends NbaPlayer {
  ovr: number
  out: number
  ath: number
  ply: number
  def: number
}

const MIN_CURATED_ANSWER_POOL_SIZE = 180

const TEAM_ABBR_MAP: Record<string, string> = {
  ATL: "ATL",
  BOS: "BOS",
  BKN: "BKN",
  CHA: "CHA",
  CHI: "CHI",
  CLE: "CLE",
  DAL: "DAL",
  DEN: "DEN",
  DET: "DET",
  GSW: "GS",
  GS: "GS",
  HOU: "HOU",
  IND: "IND",
  LAC: "LAC",
  LAL: "LAL",
  MEM: "MEM",
  MIA: "MIA",
  MIL: "MIL",
  MIN: "MIN",
  NOP: "NO",
  NO: "NO",
  NYK: "NY",
  NY: "NY",
  OKC: "OKC",
  ORL: "ORL",
  PHI: "PHI",
  PHO: "PHX",
  PHX: "PHX",
  POR: "POR",
  SAC: "SAC",
  SAS: "SA",
  SA: "SA",
  TOR: "TOR",
  UTA: "UTAH",
  UTAH: "UTAH",
  WAS: "WSH",
  WSH: "WSH",
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.'`\-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function toInt(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetch2KRatingsPage(page: number): Promise<TwoKRatingsRow[]> {
  // 2kratings.com lists all players with their attribute breakdowns
  const url = `https://www.2kratings.com/nba-2k26-ratings?page=${page}`
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`2KRatings request failed page ${page}: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: TwoKRatingsRow[] = []

  // The site uses a table or card layout — adjust selectors based on actual structure
  $("table.ratings-table tbody tr, .player-card").each((_, tr) => {
    const cells = $(tr)
      .find("td, .attr")
      .toArray()
      .map(td => $(td).text().trim())
    if (cells.length < 6) return

    const playerName = cells[0]?.replace(/\s+/g, " ").trim() ?? ""
    const rawTeamAbbr = cells[1]?.trim().toUpperCase() ?? ""
    const teamAbbr = TEAM_ABBR_MAP[rawTeamAbbr] ?? rawTeamAbbr
    const ovr = toInt(cells[2] ?? "")
    const out = toInt(cells[3] ?? "")
    const ath = toInt(cells[4] ?? "")
    const ply = toInt(cells[5] ?? "")
    const def = toInt(cells[6] ?? "")

    if (!playerName || ovr === null || out === null || ath === null || ply === null || def === null) {
      return
    }

    rows.push({ playerName, teamAbbr, ovr, out, ath, ply, def })
  })

  return rows
}

function loadNbaPlayers(): NbaPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "packages", "data", "src", "playerdle", "nba", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NbaPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const answerPoolPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "playerdle",
    "nba",
    "answer_pool.json",
  )
  return new Set(JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[])
}

function buildNba2kPlayers(nbaPlayers: NbaPlayer[], ratingRows: TwoKRatingsRow[]): Nba2kPlayer[] {
  const byName = new Map<string, TwoKRatingsRow[]>()
  for (const row of ratingRows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) byName.set(normalized, [])
    byName.get(normalized)!.push(row)
  }

  const nba2kPlayers: Nba2kPlayer[] = []

  for (const player of nbaPlayers) {
    const normalized = normalizeName(player.name)
    const candidates = byName.get(normalized)
    if (!candidates || candidates.length === 0) continue

    const teamMatch = candidates.find(c => c.teamAbbr === player.teamAbbr)
    const selected = teamMatch ?? candidates[0]

    nba2kPlayers.push({
      ...player,
      ovr: selected.ovr,
      out: selected.out,
      ath: selected.ath,
      ply: selected.ply,
      def: selected.def,
    })
  }

  return nba2kPlayers.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(players: Nba2kPlayer[], classicAnswerPoolIds: Set<string>): string[] {
  const curated = players.filter(p => classicAnswerPoolIds.has(p.id))
  if (curated.length >= MIN_CURATED_ANSWER_POOL_SIZE) return curated.map(p => p.id)

  const missing = MIN_CURATED_ANSWER_POOL_SIZE - curated.length
  const curatedIdSet = new Set(curated.map(p => p.id))
  const fallback = players
    .filter(p => !curatedIdSet.has(p.id))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, missing)

  return [...curated, ...fallback].map(p => p.id)
}

function writeData(players: Nba2kPlayer[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const base = resolve(__dirname, "..", "packages", "data", "src", "playerdle", "nba")
  const playersPath = resolve(base, "nba2k_players.json")
  const answerPoolPath = resolve(base, "nba2k_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} NBA 2K players to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} NBA 2K answer IDs to ${answerPoolPath}`)
}

async function main() {
  console.log("NBA 2K26 Ratings Scraper (2kratings.com)")
  console.log("=".repeat(50))

  const nbaPlayers = loadNbaPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${nbaPlayers.length} NBA players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NBA answer pool IDs`)

  const allRows: TwoKRatingsRow[] = []
  for (let page = 1; page <= 15; page++) {
    const rows = await fetch2KRatingsPage(page)
    if (rows.length === 0) {
      console.log(`No rows on page ${page}, stopping`)
      break
    }
    allRows.push(...rows)
    console.log(`Page ${page}: ${rows.length} rows (total: ${allRows.length})`)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`Total rows fetched: ${allRows.length}`)

  const nba2kPlayers = buildNba2kPlayers(nbaPlayers, allRows)
  const answerPoolIds = buildCuratedAnswerPool(nba2kPlayers, classicAnswerPoolIds)
  console.log(`Built ${nba2kPlayers.length} NBA 2K player records`)
  console.log(`Selected ${answerPoolIds.length} curated answer IDs`)

  writeData(nba2kPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
