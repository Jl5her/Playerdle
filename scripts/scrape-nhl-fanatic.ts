#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

interface NhlPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
}

interface HockeyReferenceSkaterRow {
  playerName: string
  teamAbbr: string
  gamesPlayed: number
  goals: number
  assists: number
  points: number
  shotsOnGoal: number
  toiPerGame: number
}

interface FanaticSkater extends NhlPlayer {
  gp: number
  goals: number
  assists: number
  points: number
  sog: number
  toiPerGame: number
}

const MIN_GAMES_PLAYED = 20
const MIN_TOI_PER_GAME = 10
const MIN_CURATED_ANSWER_POOL_SIZE = 180

const TEAM_ABBR_MAP: Record<string, string> = {
  LAK: "LA",
  NJD: "NJ",
  SJS: "SJ",
  TBL: "TB",
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
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseToiPerGame(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parts = trimmed.split(":")
  if (parts.length !== 2) return null
  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  return Number((minutes + seconds / 60).toFixed(1))
}

async function fetchSkaterRows(season: number): Promise<HockeyReferenceSkaterRow[]> {
  const url = `https://www.hockey-reference.com/leagues/NHL_${season}_skaters.html`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`Hockey Reference request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: HockeyReferenceSkaterRow[] = []

  $("#player_stats tbody tr").each((_, tr) => {
    const row = $(tr)
    if (row.hasClass("thead")) return

    const playerName = row.find("td[data-stat='name_display']").text().trim()
    const rawTeamAbbr = row.find("td[data-stat='team_name_abbr']").text().trim().toUpperCase()
    const teamAbbr = TEAM_ABBR_MAP[rawTeamAbbr] ?? rawTeamAbbr
    const gamesPlayed = toNumber(row.find("td[data-stat='games']").text())
    const goals = toNumber(row.find("td[data-stat='goals']").text())
    const assists = toNumber(row.find("td[data-stat='assists']").text())
    const points = toNumber(row.find("td[data-stat='points']").text())
    const shotsOnGoal = toNumber(row.find("td[data-stat='shots']").text())
    const toiPerGame = parseToiPerGame(row.find("td[data-stat='time_on_ice_avg']").text())
    const position = row.find("td[data-stat='pos']").text().trim().toUpperCase()

    if (
      !playerName ||
      !teamAbbr ||
      position === "G" ||
      gamesPlayed === null ||
      goals === null ||
      assists === null ||
      points === null ||
      shotsOnGoal === null ||
      toiPerGame === null
    ) {
      return
    }

    rows.push({
      playerName,
      teamAbbr,
      gamesPlayed,
      goals,
      assists,
      points,
      shotsOnGoal,
      toiPerGame,
    })
  })

  const byName = new Map<string, HockeyReferenceSkaterRow[]>()
  for (const row of rows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const selected: HockeyReferenceSkaterRow[] = []
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

function loadNhlPlayers(): NhlPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nhl", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NhlPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nhl", "answer_pool.json")
  return new Set(JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[])
}

function buildFanaticSkaters(
  players: NhlPlayer[],
  rows: HockeyReferenceSkaterRow[],
): FanaticSkater[] {
  const byName = new Map<string, HockeyReferenceSkaterRow[]>()
  for (const row of rows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const fanatics: FanaticSkater[] = []

  for (const player of players) {
    if (String(player.position).toUpperCase() === "G") continue

    const normalized = normalizeName(player.name)
    const matches = byName.get(normalized)
    if (!matches || matches.length === 0) continue

    const teamMatch = matches.find(match => match.teamAbbr === player.teamAbbr)
    const selected = teamMatch ?? matches[0]

    if (selected.gamesPlayed < MIN_GAMES_PLAYED || selected.toiPerGame < MIN_TOI_PER_GAME) {
      continue
    }

    fanatics.push({
      ...player,
      gp: selected.gamesPlayed,
      goals: selected.goals,
      assists: selected.assists,
      points: selected.points,
      sog: selected.shotsOnGoal,
      toiPerGame: selected.toiPerGame,
    })
  }

  return fanatics.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(
  players: FanaticSkater[],
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
    .sort((a, b) => b.points - a.points)
    .slice(0, missing)

  return [...curated, ...fallback].map(player => player.id)
}

function writeData(players: FanaticSkater[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nhl", "fanatic_players.json")
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nhl", "fanatic_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} NHL Fanatic skaters to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} NHL Fanatic answer IDs to ${answerPoolPath}`)
}

async function main() {
  const season = parseSeasonArg()
  console.log("NHL Fanatic Scraper (Skaters Only)")
  console.log("=".repeat(50))
  console.log(`Season: ${season}`)

  const players = loadNhlPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${players.length} NHL players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NHL answer pool IDs`)

  const rows = await fetchSkaterRows(season)
  console.log(`Loaded ${rows.length} NHL skater stat rows`)

  const fanaticPlayers = buildFanaticSkaters(players, rows)
  const answerPoolIds = buildCuratedAnswerPool(fanaticPlayers, classicAnswerPoolIds)
  console.log(`Selected ${answerPoolIds.length} curated NHL Fanatic answer IDs`)

  writeData(fanaticPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
