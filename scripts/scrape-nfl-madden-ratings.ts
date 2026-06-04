#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

interface NflPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
  numberBackfilled?: boolean
}

interface MutHeadRow {
  playerName: string
  position: string
  teamAbbr: string
  ovr: number
  spd: number
  awr: number
  str: number
}

interface MaddenPlayer extends NflPlayer {
  ovr: number
  spd: number
  awr: number
  str: number
}

const MIN_CURATED_ANSWER_POOL_SIZE = 150

const TEAM_ABBR_MAP: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WSH",
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

async function fetchMutHeadPage(page: number): Promise<MutHeadRow[]> {
  const url = `https://www.muthead.com/26/players/?sort=overall&order=desc&page=${page}`
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`MutHead request failed page ${page}: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: MutHeadRow[] = []

  $("table.players-table tbody tr, .player-list .player-row").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .toArray()
      .map(td => $(td).text().trim())
    if (cells.length < 5) return

    // Column layout varies — adjust indices based on actual site structure
    const playerName = cells[1]?.replace(/\s+/g, " ").trim() ?? ""
    const position = cells[2]?.trim() ?? ""
    const teamName = cells[3]?.trim() ?? ""
    const teamAbbr = TEAM_ABBR_MAP[teamName] ?? teamName.substring(0, 3).toUpperCase()
    const ovr = toInt(cells[4] ?? "")
    const spd = toInt(cells[5] ?? "")
    const awr = toInt(cells[6] ?? "")
    const str = toInt(cells[7] ?? "")

    if (!playerName || ovr === null || spd === null || awr === null || str === null) return

    rows.push({ playerName, position, teamAbbr, ovr, spd, awr, str })
  })

  return rows
}

function loadNflPlayers(): NflPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "packages", "data", "src", "playerdle", "nfl", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NflPlayer[]
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
    "nfl",
    "answer_pool.json",
  )
  return new Set(JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[])
}

function buildMaddenPlayers(
  nflPlayers: NflPlayer[],
  mutHeadRows: MutHeadRow[],
): MaddenPlayer[] {
  const byName = new Map<string, MutHeadRow[]>()
  for (const row of mutHeadRows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) byName.set(normalized, [])
    byName.get(normalized)!.push(row)
  }

  const maddenPlayers: MaddenPlayer[] = []

  for (const player of nflPlayers) {
    const normalized = normalizeName(player.name)
    const candidates = byName.get(normalized)
    if (!candidates || candidates.length === 0) continue

    const teamMatch = candidates.find(
      c => c.position === player.position && c.teamAbbr === player.teamAbbr,
    )
    const posMatch = candidates.find(c => c.position === player.position)
    const selected = teamMatch ?? posMatch ?? candidates[0]

    maddenPlayers.push({
      ...player,
      ovr: selected.ovr,
      spd: selected.spd,
      awr: selected.awr,
      str: selected.str,
    })
  }

  return maddenPlayers.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(players: MaddenPlayer[], classicAnswerPoolIds: Set<string>): string[] {
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

function writeData(players: MaddenPlayer[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const base = resolve(__dirname, "..", "packages", "data", "src", "playerdle", "nfl")
  const playersPath = resolve(base, "madden_players.json")
  const answerPoolPath = resolve(base, "madden_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} Madden players to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} Madden answer IDs to ${answerPoolPath}`)
}

async function main() {
  console.log("NFL Madden 26 Ratings Scraper (muthead.com)")
  console.log("=".repeat(50))

  const nflPlayers = loadNflPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${nflPlayers.length} NFL players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NFL answer pool IDs`)

  const allRows: MutHeadRow[] = []
  // Fetch enough pages to cover all active players (typically 10-15 pages at 25/page)
  for (let page = 1; page <= 20; page++) {
    const rows = await fetchMutHeadPage(page)
    if (rows.length === 0) {
      console.log(`No rows on page ${page}, stopping`)
      break
    }
    allRows.push(...rows)
    console.log(`Page ${page}: ${rows.length} rows (total: ${allRows.length})`)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`Total rows fetched: ${allRows.length}`)

  const maddenPlayers = buildMaddenPlayers(nflPlayers, allRows)
  const answerPoolIds = buildCuratedAnswerPool(maddenPlayers, classicAnswerPoolIds)
  console.log(`Built ${maddenPlayers.length} Madden player records`)
  console.log(`Selected ${answerPoolIds.length} curated answer IDs`)

  writeData(maddenPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
