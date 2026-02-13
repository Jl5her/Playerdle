#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

interface NBAPlayer {
  id: string
  name: string
  teamAbbr: string
}

interface FantasyProsPlayer {
  player_name: string
  player_team_id?: string
  rank_ecr?: string | number
}

const TIER_A_RANK_MAX = 80
const TIER_B_RANK_MAX = 200
const TIER_B_TOP_HALF_CUTOFF = 200

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

function loadNbaPlayers(): NBAPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nba", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NBAPlayer[]
}

function buildPlayerLookup(players: NBAPlayer[]) {
  const byName = new Map<string, NBAPlayer[]>()
  const byNameAndTeam = new Map<string, NBAPlayer>()

  for (const player of players) {
    const normalized = normalizeName(player.name)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)!.push(player)
    byNameAndTeam.set(`${normalized}|${player.teamAbbr.toUpperCase()}`, player)
  }

  return { byName, byNameAndTeam }
}

async function fetchFantasyProsPlayers(): Promise<FantasyProsPlayer[]> {
  const url = "https://www.fantasypros.com/nba/rankings/overall.php"
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`FantasyPros NBA request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(/var\s+ecrData\s*=\s*(\{.*?\});/s)
  if (!match) {
    throw new Error("Could not find FantasyPros NBA ecrData payload")
  }

  const parsed = JSON.parse(match[1]) as { players?: FantasyProsPlayer[] }
  if (!parsed.players || parsed.players.length === 0) {
    throw new Error("FantasyPros NBA payload did not contain players")
  }

  return parsed.players
}

function toRank(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  return null
}

function resolveFantasyPlayer(
  fp: FantasyProsPlayer,
  lookup: ReturnType<typeof buildPlayerLookup>,
): NBAPlayer | null {
  const normalizedName = normalizeName(fp.player_name)
  const team = fp.player_team_id?.toUpperCase()

  if (team) {
    const byTeam = lookup.byNameAndTeam.get(`${normalizedName}|${team}`)
    if (byTeam) return byTeam
  }

  const byName = lookup.byName.get(normalizedName)
  if (!byName || byName.length === 0) return null
  if (byName.length === 1) return byName[0]

  if (team) {
    return byName.find(player => player.teamAbbr.toUpperCase() === team) ?? null
  }

  return null
}

function buildNbaAnswerPoolIds(
  players: NBAPlayer[],
  fantasyPlayers: FantasyProsPlayer[],
): string[] {
  const lookup = buildPlayerLookup(players)
  const ids = new Set<string>()
  const fantasyRankById = new Map<string, number>()

  for (const fp of fantasyPlayers) {
    const rank = toRank(fp.rank_ecr)
    if (rank === null) continue

    const resolved = resolveFantasyPlayer(fp, lookup)
    if (!resolved) continue

    if (!fantasyRankById.has(resolved.id) || rank < fantasyRankById.get(resolved.id)!) {
      fantasyRankById.set(resolved.id, rank)
    }

    if (rank <= TIER_A_RANK_MAX) {
      ids.add(resolved.id)
      continue
    }

    if (rank > TIER_A_RANK_MAX && rank <= TIER_B_TOP_HALF_CUTOFF && rank <= TIER_B_RANK_MAX) {
      ids.add(resolved.id)
    }
  }

  return Array.from(ids)
}

function writeAnswerPool(ids: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "nba", "answer_pool.json")
  writeFileSync(outputPath, `${JSON.stringify(ids, null, 2)}\n`, "utf-8")
  console.log(`Saved ${ids.length} NBA answer pool IDs to ${outputPath}`)
}

async function main() {
  console.log("NBA Answer Pool Generator")
  console.log("=".repeat(50))
  console.log(`Tier A: top ${TIER_A_RANK_MAX}`)
  console.log(`Tier B: ${TIER_A_RANK_MAX + 1}-${TIER_B_TOP_HALF_CUTOFF}`)

  const players = loadNbaPlayers()
  console.log(`Loaded ${players.length} NBA players from superset`)

  const fantasyPlayers = await fetchFantasyProsPlayers()

  console.log(`Loaded ${fantasyPlayers.length} FantasyPros NBA ranked players`)

  const ids = buildNbaAnswerPoolIds(players, fantasyPlayers)
  writeAnswerPool(ids)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
