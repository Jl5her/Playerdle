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

interface BasketballReferenceRow {
  playerName: string
  teamAbbr: string
  gamesPlayed: number
  minutesPerGame: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgPct: number
  ftPct: number
  threePct: number
}

interface FanaticPlayer extends NbaPlayer {
  gp: number
  mpg: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgPct: number
  ftPct: number
  threePct: number
}

const MIN_GAMES_PLAYED = 15
const MIN_MINUTES_PER_GAME = 10
const MIN_CURATED_ANSWER_POOL_SIZE = 180

const TEAM_ABBR_MAP: Record<string, string> = {
  ATL: "ATL",
  BOS: "BOS",
  BRK: "BKN",
  BKN: "BKN",
  CHI: "CHI",
  CHO: "CHA",
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
  TOT: "TOT",
}

function parseSeasonArg(): number {
  const seasonArg = process.argv.find(arg => arg.startsWith("--season="))
  if (seasonArg) {
    const value = Number(seasonArg.split("=")[1])
    if (!Number.isFinite(value)) {
      throw new Error("Invalid --season value. Example: --season=2026")
    }
    return value
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return month >= 7 ? year + 1 : year
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
  if (!value || value.trim().length === 0) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toPct(value: string): number | null {
  const parsed = toNumber(value)
  if (parsed === null) return null
  return Number((parsed * 100).toFixed(1))
}

function toRate(value: string): number | null {
  const parsed = toNumber(value)
  if (parsed === null) return null
  return Number(parsed.toFixed(1))
}

async function fetchBasketballReferenceRows(season: number): Promise<BasketballReferenceRow[]> {
  const url = `https://www.basketball-reference.com/leagues/NBA_${season}_per_game.html`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`Basketball Reference request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: BasketballReferenceRow[] = []

  $("#per_game_stats tbody tr").each((_, row) => {
    const $row = $(row)
    if ($row.hasClass("thead")) return

    const playerName = $row.find("td[data-stat='name_display']").text().trim()
    const rawTeamAbbr = $row.find("td[data-stat='team_name_abbr']").text().trim().toUpperCase()
    const teamAbbr = TEAM_ABBR_MAP[rawTeamAbbr] ?? rawTeamAbbr
    const gamesPlayed = toNumber($row.find("td[data-stat='games']").text().trim())
    const minutesPerGame = toRate($row.find("td[data-stat='mp_per_g']").text().trim())
    const pts = toRate($row.find("td[data-stat='pts_per_g']").text().trim())
    const reb = toRate($row.find("td[data-stat='trb_per_g']").text().trim())
    const ast = toRate($row.find("td[data-stat='ast_per_g']").text().trim())
    const stl = toRate($row.find("td[data-stat='stl_per_g']").text().trim())
    const blk = toRate($row.find("td[data-stat='blk_per_g']").text().trim())
    const tov = toRate($row.find("td[data-stat='tov_per_g']").text().trim())
    const fgPct = toPct($row.find("td[data-stat='fg_pct']").text().trim())
    const ftPct = toPct($row.find("td[data-stat='ft_pct']").text().trim())
    const threePct = toPct($row.find("td[data-stat='fg3_pct']").text().trim())

    if (
      !playerName ||
      !teamAbbr ||
      gamesPlayed === null ||
      minutesPerGame === null ||
      pts === null ||
      reb === null ||
      ast === null ||
      stl === null ||
      blk === null ||
      tov === null ||
      fgPct === null ||
      ftPct === null ||
      threePct === null
    ) {
      return
    }

    rows.push({
      playerName,
      teamAbbr,
      gamesPlayed,
      minutesPerGame,
      pts,
      reb,
      ast,
      stl,
      blk,
      tov,
      fgPct,
      ftPct,
      threePct,
    })
  })

  const byName = new Map<string, BasketballReferenceRow[]>()
  for (const row of rows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const selected: BasketballReferenceRow[] = []
  for (const candidates of byName.values()) {
    const totalRow = candidates.find(candidate => candidate.teamAbbr === "TOT")
    if (totalRow) {
      selected.push(totalRow)
      continue
    }

    candidates.sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    selected.push(candidates[0])
  }

  return selected
}

function loadNbaPlayers(): NbaPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nba", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NbaPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nba", "answer_pool.json")
  const ids = JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[]
  return new Set(ids)
}

function buildFanaticPlayers(players: NbaPlayer[], seasonRows: BasketballReferenceRow[]): FanaticPlayer[] {
  const byName = new Map<string, BasketballReferenceRow[]>()
  for (const row of seasonRows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const fanaticPlayers: FanaticPlayer[] = []

  for (const player of players) {
    const normalized = normalizeName(player.name)
    const matches = byName.get(normalized)
    if (!matches || matches.length === 0) continue

    const teamMatch = matches.find(match => match.teamAbbr === player.teamAbbr)
    const selected = teamMatch ?? matches[0]

    if (
      selected.gamesPlayed < MIN_GAMES_PLAYED ||
      selected.minutesPerGame < MIN_MINUTES_PER_GAME
    ) {
      continue
    }

    fanaticPlayers.push({
      ...player,
      gp: selected.gamesPlayed,
      mpg: selected.minutesPerGame,
      pts: selected.pts,
      reb: selected.reb,
      ast: selected.ast,
      stl: selected.stl,
      blk: selected.blk,
      tov: selected.tov,
      fgPct: selected.fgPct,
      ftPct: selected.ftPct,
      threePct: selected.threePct,
    })
  }

  return fanaticPlayers.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedFanaticAnswerPoolIds(players: FanaticPlayer[], classicAnswerPoolIds: Set<string>): string[] {
  const curated = players.filter(player => classicAnswerPoolIds.has(player.id))

  if (curated.length >= MIN_CURATED_ANSWER_POOL_SIZE) {
    return curated.map(player => player.id)
  }

  const missing = MIN_CURATED_ANSWER_POOL_SIZE - curated.length
  const curatedIdSet = new Set(curated.map(player => player.id))
  const fallback = players
    .filter(player => !curatedIdSet.has(player.id))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, missing)

  return [...curated, ...fallback].map(player => player.id)
}

function writeFanaticData(players: FanaticPlayer[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nba", "fanatic_players.json")
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nba", "fanatic_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} Fanatic players to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} Fanatic answer IDs to ${answerPoolPath}`)
}

async function main() {
  const season = parseSeasonArg()
  console.log("NBA Fanatic Season Average Scraper")
  console.log("=".repeat(50))
  console.log(`Season: ${season}`)

  const players = loadNbaPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${players.length} NBA players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NBA answer pool IDs`)

  const seasonRows = await fetchBasketballReferenceRows(season)
  console.log(`Loaded ${seasonRows.length} Basketball Reference season-average rows`)

  const fanaticPlayers = buildFanaticPlayers(players, seasonRows)
  const fanaticAnswerPoolIds = buildCuratedFanaticAnswerPoolIds(fanaticPlayers, classicAnswerPoolIds)
  console.log(`Selected ${fanaticAnswerPoolIds.length} curated Fanatic answer pool IDs`)
  writeFanaticData(fanaticPlayers, fanaticAnswerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
