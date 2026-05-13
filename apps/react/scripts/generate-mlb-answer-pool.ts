#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

interface MLBPlayer {
  id: string
  name: string
  teamAbbr: string
}

interface FantasyProsPlayer {
  player_name: string
  player_team_id?: string
  rank_ecr?: string | number
}

interface MlbLeaderEntry {
  person?: { fullName?: string }
  rank?: number
}

const TIER_A_RANK_MAX = 150
const TIER_B_RANK_MAX = 350
const TIER_B_TOP_HALF_CUTOFF = 250
const MAX_LEADER_ADDITIONS = 35

const TEAM_ABBR_ALIASES: Record<string, string> = {
  ATH: "OAK",
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

function normalizeTeamAbbr(teamAbbr: string | undefined): string | null {
  if (!teamAbbr) return null
  const upper = teamAbbr.trim().toUpperCase()
  return TEAM_ABBR_ALIASES[upper] ?? upper
}

function loadMlbPlayers(): MLBPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "mlb", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as MLBPlayer[]
}

function buildPlayerLookup(players: MLBPlayer[]) {
  const byName = new Map<string, MLBPlayer[]>()
  const byNameAndTeam = new Map<string, MLBPlayer>()

  for (const player of players) {
    const normalized = normalizeName(player.name)
    if (!byName.has(normalized)) {
      byName.set(normalized, [])
    }
    byName.get(normalized)!.push(player)
    byNameAndTeam.set(`${normalized}|${normalizeTeamAbbr(player.teamAbbr)}`, player)
  }

  return { byName, byNameAndTeam }
}

async function fetchFantasyProsPlayers(): Promise<FantasyProsPlayer[]> {
  const url = "https://www.fantasypros.com/mlb/rankings/overall.php"
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`FantasyPros request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(/var\s+ecrData\s*=\s*(\{.*?\});/s)
  if (!match) {
    throw new Error("Could not find FantasyPros ecrData payload")
  }

  const parsed = JSON.parse(match[1]) as { players?: FantasyProsPlayer[] }
  if (!parsed.players || parsed.players.length === 0) {
    throw new Error("FantasyPros payload did not contain players")
  }

  return parsed.players
}

async function fetchMlbLeaders(): Promise<string[]> {
  const categories = [
    "homeRuns",
    "runsBattedIn",
    "battingAverage",
    "onBasePercentage",
    "ops",
    "wins",
    "earnedRunAverage",
    "strikeOuts",
    "saves",
  ]

  const url = `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=${categories.join(",")}&season=2025&leaderGameTypes=R&limit=40`
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) {
    throw new Error(`MLB leaders request failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as { leagueLeaders?: Array<{ leaders?: MlbLeaderEntry[] }> }
  const names: string[] = []

  for (const category of data.leagueLeaders ?? []) {
    for (const leader of category.leaders ?? []) {
      if (leader.person?.fullName) {
        names.push(leader.person.fullName)
      }
    }
  }

  return names
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
): MLBPlayer | null {
  const normalizedName = normalizeName(fp.player_name)
  const normalizedTeam = normalizeTeamAbbr(fp.player_team_id)

  if (normalizedTeam) {
    const byTeam = lookup.byNameAndTeam.get(`${normalizedName}|${normalizedTeam}`)
    if (byTeam) return byTeam
  }

  const byName = lookup.byName.get(normalizedName)
  if (!byName || byName.length === 0) return null
  if (byName.length === 1) return byName[0]

  if (normalizedTeam) {
    return byName.find(player => normalizeTeamAbbr(player.teamAbbr) === normalizedTeam) ?? null
  }

  return null
}

function buildMlbAnswerPoolIds(
  players: MLBPlayer[],
  fantasyPlayers: FantasyProsPlayer[],
  leaderNames: string[],
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

  const leaderCounts = new Map<string, number>()
  for (const name of leaderNames) {
    const normalized = normalizeName(name)
    const matches = lookup.byName.get(normalized) ?? []
    for (const match of matches) {
      leaderCounts.set(match.id, (leaderCounts.get(match.id) ?? 0) + 1)
    }
  }

  const leaderCandidates = Array.from(leaderCounts.entries())
    .map(([id, count]) => ({
      id,
      count,
      fantasyRank: fantasyRankById.get(id) ?? 9_999,
    }))
    .filter(candidate => !ids.has(candidate.id))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.fantasyRank - b.fantasyRank
    })

  for (const candidate of leaderCandidates.slice(0, MAX_LEADER_ADDITIONS)) {
    ids.add(candidate.id)
  }

  return Array.from(ids)
}

function writeAnswerPool(ids: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "mlb", "answer_pool.json")
  writeFileSync(outputPath, `${JSON.stringify(ids, null, 2)}\n`, "utf-8")
  console.log(`Saved ${ids.length} MLB answer pool IDs to ${outputPath}`)
}

async function main() {
  console.log("MLB Answer Pool Generator")
  console.log("=".repeat(50))

  const players = loadMlbPlayers()
  console.log(`Loaded ${players.length} MLB players from superset`)

  const [fantasyPlayers, leaderNames] = await Promise.all([
    fetchFantasyProsPlayers(),
    fetchMlbLeaders(),
  ])

  console.log(`Loaded ${fantasyPlayers.length} FantasyPros ranked players`)
  console.log(`Loaded ${leaderNames.length} MLB leader entries`)

  const ids = buildMlbAnswerPoolIds(players, fantasyPlayers, leaderNames)
  writeAnswerPool(ids)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
