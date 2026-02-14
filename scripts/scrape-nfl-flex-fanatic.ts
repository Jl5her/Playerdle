#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

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
const MIN_GAMES_PLAYED = 6
const MIN_CURATED_ANSWER_POOL_SIZE = 140

const TEAM_ABBR_MAP: Record<string, string> = {
  JAC: "JAX",
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

function toNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePlayerAndTeam(raw: string): { playerName: string; teamAbbr?: string } {
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!match) {
    return { playerName: raw.trim() }
  }

  const playerName = match[1].trim()
  const teamAbbr = TEAM_ABBR_MAP[match[2].trim().toUpperCase()] ?? match[2].trim().toUpperCase()
  return { playerName, teamAbbr }
}

function resolveRow(
  position: FlexPosition,
  cells: string[],
): Omit<FantasyProsFlexRow, "playerName" | "teamAbbr" | "position"> | null {
  if (position === "RB") {
    const rushYards = toNumber(cells[3])
    const rushTds = toNumber(cells[7])
    const targets = toNumber(cells[8])
    const receptions = toNumber(cells[9])
    const recYards = toNumber(cells[10])
    const recTds = toNumber(cells[12])
    const gamesPlayed = toNumber(cells[14])
    const fantasyPointsPerGame = toNumber(cells[16])

    if (
      rushYards === null ||
      rushTds === null ||
      targets === null ||
      receptions === null ||
      recYards === null ||
      recTds === null ||
      gamesPlayed === null ||
      fantasyPointsPerGame === null ||
      gamesPlayed <= 0
    ) {
      return null
    }

    const totalYards = rushYards + recYards
    const totalTds = rushTds + recTds
    return {
      gamesPlayed,
      fantasyPointsPerGame: Number(fantasyPointsPerGame.toFixed(1)),
      targetsPerGame: Number((targets / gamesPlayed).toFixed(1)),
      receptionsPerGame: Number((receptions / gamesPlayed).toFixed(1)),
      yardsPerGame: Number((totalYards / gamesPlayed).toFixed(1)),
      touchdownsPerGame: Number((totalTds / gamesPlayed).toFixed(2)),
    }
  }

  const targets = toNumber(cells[2])
  const receptions = toNumber(cells[4])
  const recYards = toNumber(cells[5])
  const recTds = toNumber(cells[8])
  const rushYards = toNumber(cells[10])
  const rushTds = toNumber(cells[11])
  const gamesPlayed = toNumber(cells[13])
  const fantasyPointsPerGame = toNumber(cells[15])

  if (
    targets === null ||
    receptions === null ||
    recYards === null ||
    recTds === null ||
    rushYards === null ||
    rushTds === null ||
    gamesPlayed === null ||
    fantasyPointsPerGame === null ||
    gamesPlayed <= 0
  ) {
    return null
  }

  const totalYards = recYards + rushYards
  const totalTds = recTds + rushTds
  return {
    gamesPlayed,
    fantasyPointsPerGame: Number(fantasyPointsPerGame.toFixed(1)),
    targetsPerGame: Number((targets / gamesPlayed).toFixed(1)),
    receptionsPerGame: Number((receptions / gamesPlayed).toFixed(1)),
    yardsPerGame: Number((totalYards / gamesPlayed).toFixed(1)),
    touchdownsPerGame: Number((totalTds / gamesPlayed).toFixed(2)),
  }
}

async function fetchPositionRows(position: FlexPosition): Promise<FantasyProsFlexRow[]> {
  const url = `https://www.fantasypros.com/nfl/stats/${position.toLowerCase()}.php?scoring=HALF`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`FantasyPros request failed for ${position}: HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const rows: FantasyProsFlexRow[] = []

  $("#data tbody tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .toArray()
      .map(td => $(td).text().trim())
    if (cells.length < 16) return

    const playerCell = cells[1]
    if (!playerCell) return

    const { playerName, teamAbbr } = parsePlayerAndTeam(playerCell)
    const derived = resolveRow(position, cells)
    if (!derived) return

    rows.push({
      position,
      playerName,
      teamAbbr,
      gamesPlayed: derived.gamesPlayed,
      fantasyPointsPerGame: derived.fantasyPointsPerGame,
      targetsPerGame: derived.targetsPerGame,
      receptionsPerGame: derived.receptionsPerGame,
      yardsPerGame: derived.yardsPerGame,
      touchdownsPerGame: derived.touchdownsPerGame,
    })
  })

  return rows
}

function loadNflPlayers(): NflPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nfl", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NflPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nfl", "answer_pool.json")
  return new Set(JSON.parse(readFileSync(answerPoolPath, "utf-8")) as string[])
}

function buildFanaticFlexPlayers(
  nflPlayers: NflPlayer[],
  fantasyRows: FantasyProsFlexRow[],
): FanaticFlexPlayer[] {
  const eligiblePlayers = nflPlayers.filter(player => FLEX_POSITIONS.includes(player.position as FlexPosition))
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
        candidate.position === player.position && (!candidate.teamAbbr || candidate.teamAbbr === player.teamAbbr),
    )
    const posMatch = candidates.find(candidate => candidate.position === player.position)
    const selected = teamMatch ?? posMatch ?? candidates[0]

    if (selected.gamesPlayed < MIN_GAMES_PLAYED) continue

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

function buildCuratedAnswerPool(players: FanaticFlexPlayer[], classicAnswerPoolIds: Set<string>): string[] {
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
  const playersPath = resolve(__dirname, "..", "src", "data", "nfl", "fanatic_players.json")
  const answerPoolPath = resolve(__dirname, "..", "src", "data", "nfl", "fanatic_answer_pool.json")

  writeFileSync(playersPath, `${JSON.stringify(players, null, 2)}\n`, "utf-8")
  writeFileSync(answerPoolPath, `${JSON.stringify(answerPoolIds, null, 2)}\n`, "utf-8")

  console.log(`Saved ${players.length} NFL Flex Fanatic players to ${playersPath}`)
  console.log(`Saved ${answerPoolIds.length} NFL Flex Fanatic answer IDs to ${answerPoolPath}`)
}

async function main() {
  console.log("NFL Flex Fanatic Scraper (Half-PPR)")
  console.log("=".repeat(50))

  const nflPlayers = loadNflPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(`Loaded ${nflPlayers.length} NFL players`)
  console.log(`Loaded ${classicAnswerPoolIds.size} classic NFL answer pool IDs`)

  const allRows: FantasyProsFlexRow[] = []
  for (const position of FLEX_POSITIONS) {
    const rows = await fetchPositionRows(position)
    allRows.push(...rows)
    console.log(`Loaded ${rows.length} ${position} fantasy stat rows`)
    await new Promise(resolveDelay => setTimeout(resolveDelay, 500))
  }

  const fanaticPlayers = buildFanaticFlexPlayers(nflPlayers, allRows)
  const answerPoolIds = buildCuratedAnswerPool(fanaticPlayers, classicAnswerPoolIds)
  console.log(`Selected ${answerPoolIds.length} curated NFL Flex answer IDs`)

  writeData(fanaticPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
