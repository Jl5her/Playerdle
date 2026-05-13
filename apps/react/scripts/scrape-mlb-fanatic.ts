#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

interface MlbPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
  league?: string
}

interface BaseballReferenceBatterRow {
  playerName: string
  teamAbbr: string
  gamesPlayed: number
  plateAppearances: number
  avg: number
  hr: number
  rbi: number
  sb: number
  ops: number
}

interface FanaticBatter extends MlbPlayer {
  gp: number
  pa: number
  avg: number
  hr: number
  rbi: number
  sb: number
  ops: number
}

const MIN_GAMES_PLAYED = 30
const MIN_PLATE_APPEARANCES = 100
const MIN_CURATED_ANSWER_POOL_SIZE = 170

const TEAM_ABBR_MAP: Record<string, string> = {
  KCR: "KC",
  SDP: "SD",
  SFG: "SF",
  TBR: "TB",
  WSN: "WSH",
}

function parseSeasonArg(): number {
  const seasonArg = process.argv.find(arg => arg.startsWith("--season="))
  if (seasonArg) {
    const value = Number(seasonArg.split("=")[1])
    if (!Number.isFinite(value)) {
      throw new Error("Invalid --season value. Example: --season=2025")
    }
    return value
  }

  return new Date().getFullYear() - 1
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'`-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function toNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchBatterRows(season: number): Promise<BaseballReferenceBatterRow[]> {
  const url = `https://www.baseball-reference.com/leagues/majors/${season}-standard-batting.shtml`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`Baseball Reference request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: BaseballReferenceBatterRow[] = []

  $("#players_standard_batting tbody tr").each((_, tr) => {
    const row = $(tr)
    if (row.hasClass("thead")) return

    const playerName = row.find("td[data-stat='name_display']").text().trim()
    const rawTeamAbbr =
      row.find("td[data-stat='b_team_id']").text().trim().toUpperCase() ||
      row.find("td[data-stat='team_name_abbr']").text().trim().toUpperCase()
    const teamAbbr = TEAM_ABBR_MAP[rawTeamAbbr] ?? rawTeamAbbr
    const gamesPlayed = toNumber(row.find("td[data-stat='b_games']").text())
    const plateAppearances = toNumber(row.find("td[data-stat='b_pa']").text())
    const avg = toNumber(row.find("td[data-stat='b_batting_avg']").text())
    const hr = toNumber(row.find("td[data-stat='b_hr']").text())
    const rbi = toNumber(row.find("td[data-stat='b_rbi']").text())
    const sb = toNumber(row.find("td[data-stat='b_sb']").text())
    const ops = toNumber(row.find("td[data-stat='b_onbase_plus_slugging']").text())

    if (
      !playerName ||
      !teamAbbr ||
      gamesPlayed === null ||
      plateAppearances === null ||
      avg === null ||
      hr === null ||
      rbi === null ||
      sb === null ||
      ops === null
    ) {
      return
    }

    rows.push({
      playerName,
      teamAbbr,
      gamesPlayed,
      plateAppearances,
      avg: Number(avg.toFixed(3)),
      hr,
      rbi,
      sb,
      ops: Number(ops.toFixed(3)),
    })
  })

  return rows
}

function loadMlbPlayers(): MlbPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "mlb", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as MlbPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "mlb", "answer_pool.json")
  return new Set(JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[])
}

function buildFanaticBatters(
  players: MlbPlayer[],
  rows: BaseballReferenceBatterRow[],
): FanaticBatter[] {
  const hitters = players.filter(player => !String(player.position).toUpperCase().includes("P"))
  const byName = new Map<string, BaseballReferenceBatterRow[]>()
  for (const row of rows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const fanatics: FanaticBatter[] = []

  for (const player of hitters) {
    const normalized = normalizeName(player.name)
    const matches = byName.get(normalized)
    if (!matches || matches.length === 0) continue

    const teamMatch = matches.find(match => match.teamAbbr === player.teamAbbr)
    const multiTeamMatch = matches.find(match => /\dTM/.test(match.teamAbbr))
    const selected =
      teamMatch ??
      multiTeamMatch ??
      [...matches].sort((a, b) => b.plateAppearances - a.plateAppearances)[0]

    if (
      selected.gamesPlayed < MIN_GAMES_PLAYED ||
      selected.plateAppearances < MIN_PLATE_APPEARANCES
    ) {
      continue
    }

    fanatics.push({
      ...player,
      gp: selected.gamesPlayed,
      pa: selected.plateAppearances,
      avg: selected.avg,
      hr: selected.hr,
      rbi: selected.rbi,
      sb: selected.sb,
      ops: selected.ops,
    })
  }

  return fanatics.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(
  players: FanaticBatter[],
  classicAnswerPoolIds: Set<string>,
): string[] {
  const curated = players.filter(player => classicAnswerPoolIds.has(player.id))
  if (curated.length >= MIN_CURATED_ANSWER_POOL_SIZE) {
    return curated.map(player => player.id)
  }

  const missing = MIN_CURATED_ANSWER_POOL_SIZE - curated.length
  const curatedIdSet = new Set(curated.map(player => player.id))
  const fallback = players
    .filter(player => !curatedIdSet.has(player.id))
    .sort((a, b) => b.ops - a.ops)
    .slice(0, missing)

  return [...curated, ...fallback].map(player => player.id)
}

function writeData(players: FanaticBatter[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "mlb", "fanatic_players.json")
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "mlb", "fanatic_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} MLB Fanatic hitters to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} MLB Fanatic answer IDs to ${answerPoolPath}`)
}

async function main() {
  const season = parseSeasonArg()
  console.log("MLB Fanatic Scraper (Hitters Only)")
  console.log("=".repeat(50))
  console.log(`Season: ${season}`)

  const players = loadMlbPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${players.length} MLB players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic MLB answer pool IDs`)

  const rows = await fetchBatterRows(season)
  console.log(`Loaded ${rows.length} MLB batter stat rows`)

  const fanaticPlayers = buildFanaticBatters(players, rows)
  const answerPoolIds = buildCuratedAnswerPool(fanaticPlayers, classicAnswerPoolIds)
  console.log(`Selected ${answerPoolIds.length} curated MLB Fanatic answer IDs`)

  writeData(fanaticPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
