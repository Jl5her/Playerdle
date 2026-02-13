#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

interface NHLPlayer {
  id: string
  name: string
  teamAbbr: string
  position: string
}

interface FantasyProsPlayer {
  player_name: string
  player_team_id?: string
  rank_ecr?: string | number
}

interface NhlLeaderEntry {
  firstName?: { default?: string }
  lastName?: { default?: string }
  teamAbbrev?: string
}

const TIER_A_RANK_MAX = 80
const TIER_B_RANK_MAX = 220
const TIER_B_TOP_CUTOFF = 220
const MAX_LEADER_ADDITIONS = 40
const MIN_GOALIES = 24

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

function loadNhlPlayers(): NHLPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nhl", "players.json")
  return JSON.parse(readFileSync(playersPath, "utf-8")) as NHLPlayer[]
}

function buildPlayerLookup(players: NHLPlayer[]) {
  const byName = new Map<string, NHLPlayer[]>()
  const byNameAndTeam = new Map<string, NHLPlayer>()

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
  const url = "https://www.fantasypros.com/nhl/rankings/overall.php"
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`FantasyPros NHL request failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(/var\s+ecrData\s*=\s*(\{.*?\});/s)
  if (!match) {
    throw new Error("Could not find FantasyPros NHL ecrData payload")
  }

  const parsed = JSON.parse(match[1]) as { players?: FantasyProsPlayer[] }
  if (!parsed.players || parsed.players.length === 0) {
    throw new Error("FantasyPros NHL payload did not contain players")
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
): NHLPlayer | null {
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

function nameFromLeader(entry: NhlLeaderEntry): string {
  return `${entry.firstName?.default ?? ""} ${entry.lastName?.default ?? ""}`.trim()
}

async function fetchNhlLeaderScores(): Promise<
  Array<{ normalizedName: string; teamAbbr: string; score: number }>
> {
  const [skaterResponse, goalieResponse] = await Promise.all([
    fetch("https://api-web.nhle.com/v1/skater-stats-leaders/current", {
      signal: AbortSignal.timeout(20_000),
    }),
    fetch("https://api-web.nhle.com/v1/goalie-stats-leaders/current", {
      signal: AbortSignal.timeout(20_000),
    }),
  ])

  if (!skaterResponse.ok) {
    throw new Error(`NHL skater leaders request failed: HTTP ${skaterResponse.status}`)
  }
  if (!goalieResponse.ok) {
    throw new Error(`NHL goalie leaders request failed: HTTP ${goalieResponse.status}`)
  }

  const skaterData = (await skaterResponse.json()) as Record<string, NhlLeaderEntry[]>
  const goalieData = (await goalieResponse.json()) as Record<string, NhlLeaderEntry[]>

  const scoreByKey = new Map<string, number>()

  function addCategory(entries: NhlLeaderEntry[] | undefined, weight: number) {
    if (!entries) return
    entries.slice(0, 30).forEach((entry, index) => {
      const name = nameFromLeader(entry)
      const teamAbbr = entry.teamAbbrev?.toUpperCase()
      if (!name || !teamAbbr) return
      const key = `${normalizeName(name)}|${teamAbbr}`
      const points = Math.max(1, 30 - index) * weight
      scoreByKey.set(key, (scoreByKey.get(key) ?? 0) + points)
    })
  }

  addCategory(skaterData.points, 1.2)
  addCategory(skaterData.goals, 1.0)
  addCategory(skaterData.assists, 1.0)
  addCategory(skaterData.plusMinus, 0.8)
  addCategory(skaterData.toi, 0.6)
  addCategory(goalieData.wins, 1.1)
  addCategory(goalieData.savePctg, 1.0)
  addCategory(goalieData.shutouts, 0.9)
  addCategory(goalieData.goalsAgainstAverage, 0.9)

  return Array.from(scoreByKey.entries())
    .map(([key, score]) => {
      const [normalizedName, teamAbbr] = key.split("|")
      return { normalizedName, teamAbbr, score }
    })
    .sort((a, b) => b.score - a.score)
}

function buildNhlAnswerPoolIds(
  players: NHLPlayer[],
  fantasyPlayers: FantasyProsPlayer[],
  leaderScores: Array<{ normalizedName: string; teamAbbr: string; score: number }>,
): string[] {
  const lookup = buildPlayerLookup(players)
  const ids = new Set<string>()

  for (const fp of fantasyPlayers) {
    const rank = toRank(fp.rank_ecr)
    if (rank === null) continue

    const resolved = resolveFantasyPlayer(fp, lookup)
    if (!resolved) continue

    if (rank <= TIER_A_RANK_MAX) {
      ids.add(resolved.id)
      continue
    }

    if (rank > TIER_A_RANK_MAX && rank <= TIER_B_TOP_CUTOFF && rank <= TIER_B_RANK_MAX) {
      ids.add(resolved.id)
    }
  }

  for (const leader of leaderScores) {
    if (ids.size >= TIER_B_TOP_CUTOFF + MAX_LEADER_ADDITIONS) {
      break
    }

    const byTeam = lookup.byNameAndTeam.get(`${leader.normalizedName}|${leader.teamAbbr}`)
    const byName = lookup.byName.get(leader.normalizedName)?.[0]
    const resolved = byTeam ?? byName
    if (!resolved) continue
    ids.add(resolved.id)
  }

  const goalieIds = new Set(
    players
      .filter(player => player.position.toUpperCase() === "G" && ids.has(player.id))
      .map(player => player.id),
  )

  if (goalieIds.size < MIN_GOALIES) {
    const goalieCandidates = fantasyPlayers
      .map(fp => {
        const rank = toRank(fp.rank_ecr)
        const player = resolveFantasyPlayer(fp, lookup)
        if (!player || rank === null) return null
        return { player, rank }
      })
      .filter((item): item is { player: NHLPlayer; rank: number } => item !== null)
      .filter(item => item.player.position.toUpperCase() === "G")
      .sort((a, b) => a.rank - b.rank)

    for (const candidate of goalieCandidates) {
      if (goalieIds.size >= MIN_GOALIES) break
      if (!ids.has(candidate.player.id)) {
        ids.add(candidate.player.id)
        goalieIds.add(candidate.player.id)
      }
    }
  }

  return Array.from(ids)
}

function writeAnswerPool(ids: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "nhl", "answer_pool.json")
  writeFileSync(outputPath, `${JSON.stringify(ids, null, 2)}\n`, "utf-8")
  console.log(`Saved ${ids.length} NHL answer pool IDs to ${outputPath}`)
}

async function main() {
  console.log("NHL Answer Pool Generator")
  console.log("=".repeat(50))
  console.log(`Tier A: top ${TIER_A_RANK_MAX}`)
  console.log(`Tier B: ${TIER_A_RANK_MAX + 1}-${TIER_B_TOP_CUTOFF}`)

  const players = loadNhlPlayers()
  console.log(`Loaded ${players.length} NHL players from superset`)

  const [fantasyPlayers, leaderScores] = await Promise.all([
    fetchFantasyProsPlayers(),
    fetchNhlLeaderScores(),
  ])

  console.log(`Loaded ${fantasyPlayers.length} FantasyPros NHL ranked players`)
  console.log(`Computed ${leaderScores.length} NHL leader candidates`)

  const ids = buildNhlAnswerPoolIds(players, fantasyPlayers, leaderScores)
  writeAnswerPool(ids)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
