#!/usr/bin/env tsx

import { writeFileSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

const fantasyConfig = {
  positions: {
    QB: 35,
    RB: 75,
    WR: 75,
    TE: 50,
    // "K": 15,
    // "DL": 15,
    // "LB": 5,
    // "DB": 10
  },
}

interface FantasyPlayer {
  rank: number
  name: string
  position: string
  team: string | null
}

interface NFLPlayer {
  id: string
  name: string
  position: string
}

const POSITIONS_CONFIG = fantasyConfig.positions

const FANTASYPROS_POSITIONS: Record<string, string> = {
  QB: "qb",
  RB: "rb",
  WR: "wr",
  TE: "te",
  K: "k",
  DL: "dl",
  LB: "lb",
  DB: "db",
}

const NICKNAME_MAP: Record<string, string> = {
  "marquise brown": "hollywood brown",
  "hollywood brown": "marquise brown",
}

function normalizeName(name: string): string {
  let normalized = name.trim()
  normalized = normalized.replace(/['']/g, "")
  const suffixes = [" Jr.", " Jr", " Sr.", " Sr", " II", " III", " IV", " V"]
  const nameLower = normalized.toLowerCase()

  for (const suffix of suffixes) {
    if (nameLower.endsWith(suffix.toLowerCase())) {
      normalized = normalized.slice(0, normalized.length - suffix.length)
      break
    }
  }

  return normalized.trim().toLowerCase()
}

function normalizePosition(position: string): string {
  const pos = position.toUpperCase().trim()
  if (pos === "DE" || pos === "DT" || pos === "NT") {
    return "DL"
  }
  return pos
}

function positionsAreCompatible(nflPosition: string, fantasyPosition: string): boolean {
  const nflPos = nflPosition.toUpperCase().trim()
  const fpPos = fantasyPosition.toUpperCase().trim()

  if (normalizePosition(nflPos) === normalizePosition(fpPos)) {
    return true
  }

  if (fpPos === "DL" && nflPos === "LB") return true
  if (fpPos === "LB" && (nflPos === "DE" || nflPos === "DT")) return true
  if ((fpPos === "QB" && nflPos === "TE") || (fpPos === "TE" && nflPos === "QB")) return true
  if (fpPos === "DB" && (nflPos === "CB" || nflPos === "S")) return true
  if (fpPos === "RB" && nflPos === "FB") return true

  return false
}

async function scrapeFantasyProsRankings(position: string, topN: number): Promise<FantasyPlayer[]> {
  const fpPosition = FANTASYPROS_POSITIONS[position]
  if (!fpPosition) return []

  const url = `https://www.fantasypros.com/nfl/stats/${fpPosition}.php`
  console.log(`Scraping ${position} stats from ${url}...`)

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const players: FantasyPlayer[] = []

    const table = $("#data, table.table").first()
    const tbody = table.find("tbody")
    const rows = tbody.find("tr")

    rows.slice(0, topN).each((idx, row) => {
      const $row = $(row)
      let playerCell = $row.find("td.player-label, a.fp-player-link").first()
      if (!playerCell.length) {
        playerCell = $row.find("td").first()
      }

      if (!playerCell.length) return

      const fullText = playerCell.text().trim()
      let team: string | null = null
      let playerName = fullText

      if (fullText.includes("(") && fullText.includes(")")) {
        playerName = fullText.split("(")[0].trim()
        const teamPart = fullText.split("(")[1].split(")")[0].trim()
        team = teamPart.split("-")[0].trim()
      }

      if (playerName) {
        players.push({
          rank: idx + 1,
          name: playerName,
          position,
          team,
        })
      }
    })

    console.log(`  Found ${players.length} ${position} players`)
    return players
  } catch (err) {
    console.error(`  Error fetching ${position} stats: ${err}`)
    return []
  }
}

function loadNFLPlayers(): NFLPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "nfl", "players.json")
  const data = readFileSync(playersPath, "utf-8")
  return JSON.parse(data)
}

function validateAgainstNFLDatabase(
  fantasyPlayers: FantasyPlayer[],
  nflPlayers: NFLPlayer[],
): FantasyPlayer[] {
  console.log("\nValidating fantasy players against NFL player superset...")

  const nflLookup = new Map<string, NFLPlayer[]>()
  for (const player of nflPlayers) {
    const name = normalizeName(player.name)
    if (!nflLookup.has(name)) {
      nflLookup.set(name, [])
    }
    nflLookup.get(name)!.push(player)
  }

  const validatedPlayers: FantasyPlayer[] = []
  const unmatchedPlayers: FantasyPlayer[] = []

  for (const fp of fantasyPlayers) {
    const name = normalizeName(fp.name)
    const fantasyPosition = fp.position.toUpperCase().trim()

    let nflMatches = nflLookup.get(name)
    if (!nflMatches && NICKNAME_MAP[name]) {
      nflMatches = nflLookup.get(NICKNAME_MAP[name])
    }

    if (nflMatches && nflMatches.some(p => positionsAreCompatible(p.position, fantasyPosition))) {
      validatedPlayers.push(fp)
    } else {
      unmatchedPlayers.push(fp)
    }
  }

  console.log(`  Matched: ${validatedPlayers.length}/${fantasyPlayers.length}`)
  if (unmatchedPlayers.length > 0) {
    console.log(`  Unmatched: ${unmatchedPlayers.length}`)
    unmatchedPlayers.slice(0, 10).forEach(p => {
      console.log(`    - ${p.name} (${p.position})`)
    })
  }

  return validatedPlayers
}

function buildAnswerPoolIds(fantasyPlayers: FantasyPlayer[], nflPlayers: NFLPlayer[]): string[] {
  const nflLookup = new Map<string, NFLPlayer[]>()
  for (const player of nflPlayers) {
    const name = normalizeName(player.name)
    if (!nflLookup.has(name)) {
      nflLookup.set(name, [])
    }
    nflLookup.get(name)!.push(player)
  }

  const ids = new Set<string>()

  for (const fp of fantasyPlayers) {
    const name = normalizeName(fp.name)
    const fantasyPosition = fp.position.toUpperCase().trim()

    let matches = nflLookup.get(name)
    if (!matches && NICKNAME_MAP[name]) {
      matches = nflLookup.get(NICKNAME_MAP[name])
    }
    if (!matches) continue

    const selected = matches.find(match => positionsAreCompatible(match.position, fantasyPosition))
    if (selected) {
      ids.add(selected.id)
    }
  }

  return Array.from(ids)
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "nfl", "answer_pool.json")

  console.log("NFL Answer Pool Generator")
  console.log("=".repeat(50))

  const nflPlayers = loadNFLPlayers()
  console.log(`Loaded ${nflPlayers.length} NFL players`)

  const allFantasyPlayers: FantasyPlayer[] = []
  for (const [position, count] of Object.entries(POSITIONS_CONFIG)) {
    const players = await scrapeFantasyProsRankings(position, count)
    allFantasyPlayers.push(...players)
    await new Promise(resolveDelay => setTimeout(resolveDelay, 1000))
  }

  const validatedPlayers = validateAgainstNFLDatabase(allFantasyPlayers, nflPlayers)
  const answerPoolIds = buildAnswerPoolIds(validatedPlayers, nflPlayers)

  writeFileSync(outputPath, JSON.stringify(answerPoolIds, null, 2) + "\n", "utf-8")
  console.log(`\nSaved ${answerPoolIds.length} NFL answer pool IDs to ${outputPath}`)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
