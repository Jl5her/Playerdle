#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { type FantasyProsStatRow, fetchFantasyProsStats } from "./lib/fantasypros"

type FlexPosition = "RB" | "WR" | "TE"

interface NflPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
}

interface FantasyProsFlexRow {
  position: FlexPosition
  playerName: string
  teamAbbr?: string
  gamesPlayed: number
  fantasyPointsPerGame: number
  targetsPerGame: number
  receptionsPerGame: number
  yardsPerGame: number
  touchdownsPerGame: number
}

interface FanaticFlexPlayer extends NflPlayer {
  gp: number
  fppg: number
  tgtPerGame: number
  recPerGame: number
  ydsPerGame: number
  tdPerGame: number
}

const FLEX_POSITIONS: FlexPosition[] = ["RB", "WR", "TE"]
// Full-season games-played floor. Early in a season nobody has 6 games yet,
// so the effective floor scales down with the most games anyone has played.
const MIN_GAMES_PLAYED = 6
const MIN_GAMES_PLAYED_RATIO = 0.6
const MIN_CURATED_ANSWER_POOL_SIZE = 140

// NFL seasons are named by the year they kick off (September). Before
// September we're in the offseason, so the most recent season is last year's.
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
  return now.getMonth() >= 8 ? year : year - 1
}

const NICKNAME_MAP: Record<string, string> = {
  "marquise brown": "hollywood brown",
  "hollywood brown": "marquise brown",
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

function toFlexRow(position: FlexPosition, row: FantasyProsStatRow): FantasyProsFlexRow | null {
  const gamesPlayed = row.games
  if (!gamesPlayed || gamesPlayed <= 0) return null
  const stat = (key: string) => row.stats[key] ?? 0
  // rec_att is targets on FantasyPros' stats pages
  const targets = stat("rec_att")
  const receptions = stat("rec_rec")
  const totalYards = stat("rush_yds") + stat("rec_yds")
  const totalTds = stat("rush_tds") + stat("rec_tds")
  return {
    position,
    playerName: row.name,
    teamAbbr: row.team,
    gamesPlayed,
    fantasyPointsPerGame: Number(row.fptsg.toFixed(1)),
    targetsPerGame: Number((targets / gamesPlayed).toFixed(1)),
    receptionsPerGame: Number((receptions / gamesPlayed).toFixed(1)),
    yardsPerGame: Number((totalYards / gamesPlayed).toFixed(1)),
    touchdownsPerGame: Number((totalTds / gamesPlayed).toFixed(2)),
  }
}

// Half-PPR is FantasyPros' default scoring (the old scoring=HALF param now redirects to it).
// Throws on any fetch/parse failure so a broken scrape fails the job.
async function fetchPositionRows(
  position: FlexPosition,
  season: number,
): Promise<FantasyProsFlexRow[]> {
  const rows = await fetchFantasyProsStats(position, season)
  return rows.flatMap(row => toFlexRow(position, row) ?? [])
}

function loadNflPlayers(): NflPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "playerdle",
    "nfl",
    "players.json",
  )
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
  const ids = JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[]
  if (ids.length === 0) {
    throw new Error("Classic NFL answer_pool.json is empty; run generate:answer-pool first")
  }
  return new Set(ids)
}

function buildFanaticFlexPlayers(
  nflPlayers: NflPlayer[],
  fantasyRows: FantasyProsFlexRow[],
): FanaticFlexPlayer[] {
  const eligiblePlayers = nflPlayers.filter(player =>
    FLEX_POSITIONS.includes(player.position as FlexPosition),
  )
  const maxGamesPlayed = Math.max(0, ...fantasyRows.map(row => row.gamesPlayed))
  const minGamesPlayed = Math.max(
    1,
    Math.min(MIN_GAMES_PLAYED, Math.ceil(maxGamesPlayed * MIN_GAMES_PLAYED_RATIO)),
  )
  console.log(`Minimum games played: ${minGamesPlayed}`)

  const byName = new Map<string, FantasyProsFlexRow[]>()
  for (const row of fantasyRows) {
    const normalized = normalizeName(row.playerName)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)?.push(row)
  }

  const fanaticPlayers: FanaticFlexPlayer[] = []

  for (const player of eligiblePlayers) {
    const normalized = normalizeName(player.name)
    const candidates = byName.get(normalized) ?? byName.get(NICKNAME_MAP[normalized] ?? "")
    if (!candidates || candidates.length === 0) continue

    const teamMatch = candidates.find(
      candidate =>
        candidate.position === player.position &&
        (!candidate.teamAbbr || candidate.teamAbbr === player.teamAbbr),
    )
    const posMatch = candidates.find(candidate => candidate.position === player.position)
    const selected = teamMatch ?? posMatch ?? candidates[0]

    if (selected.gamesPlayed < minGamesPlayed) continue

    fanaticPlayers.push({
      ...player,
      gp: selected.gamesPlayed,
      fppg: selected.fantasyPointsPerGame,
      tgtPerGame: selected.targetsPerGame,
      recPerGame: selected.receptionsPerGame,
      ydsPerGame: selected.yardsPerGame,
      tdPerGame: selected.touchdownsPerGame,
    })
  }

  return fanaticPlayers.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(
  players: FanaticFlexPlayer[],
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
    .sort((a, b) => b.fppg - a.fppg)
    .slice(0, missing)

  return [...curated, ...fallback].map(player => player.id)
}

function writeData(players: FanaticFlexPlayer[], answerPoolIds: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "playerdle",
    "nfl",
    "fanatic_players.json",
  )
  const answerPoolPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "playerdle",
    "nfl",
    "fanatic_answer_pool.json",
  )

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} NFL Flex Fanatic players to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} NFL Flex Fanatic answer IDs to ${answerPoolPath}`)
}

async function main() {
  const season = parseSeasonArg()

  console.log("NFL Flex Fanatic Scraper (Half-PPR)")
  console.log("=".repeat(50))
  console.log(`Season: ${season}`)

  const nflPlayers = loadNflPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${nflPlayers.length} NFL players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NFL answer pool IDs`)

  const allRows: FantasyProsFlexRow[] = []
  for (const position of FLEX_POSITIONS) {
    const rows = await fetchPositionRows(position, season)
    allRows.push(...rows)
    console.log(`Loaded ${rows.length} ${position} fantasy stat rows`)
    await new Promise(resolveDelay => setTimeout(resolveDelay, 500))
  }

  const fanaticPlayers = buildFanaticFlexPlayers(nflPlayers, allRows)
  const answerPoolIds = buildCuratedAnswerPool(fanaticPlayers, classicAnswerPoolIds)
  console.log(`Selected ${answerPoolIds.length} curated NFL Flex answer IDs`)

  // Refuse to overwrite good data with a broken scrape
  if (fanaticPlayers.length < MIN_CURATED_ANSWER_POOL_SIZE) {
    throw new Error(
      `Only ${fanaticPlayers.length} Flex Fanatic players (minimum ${MIN_CURATED_ANSWER_POOL_SIZE}); ` +
        "keeping the existing data",
    )
  }

  writeData(fanaticPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
