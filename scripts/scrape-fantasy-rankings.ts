#!/usr/bin/env tsx
/**
 * Scrape FantasyPros rankings to build a fantasy-focused player database.
 * Only gets position, team, and rank from FantasyPros.
 */

import { writeFileSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"
import fantasyConfig from "../src/data/fantasy-config.json" with { type: "json" }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FantasyPlayer {
  rank: number
  name: string
  position: string
  team: string | null
}

interface NFLPlayer {
  espnId: string | null
  teamId: number
  name: string
  position: string
  number: number
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POSITIONS_CONFIG = fantasyConfig.positions

// FantasyPros position URL mapping
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

// Known nickname mappings
const NICKNAME_MAP: Record<string, string> = {
  "marquise brown": "hollywood brown",
  "hollywood brown": "marquise brown",
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  let normalized = name.trim()

  // Remove apostrophes and special characters
  normalized = normalized.replace(/['']/g, "")

  // Remove common suffixes (case-insensitive)
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

  // Map defensive line positions to DL
  if (pos === "DE" || pos === "DT" || pos === "NT") {
    return "DL"
  }

  return pos
}

function positionsAreCompatible(espnPosition: string, fantasyPosition: string): boolean {
  const espnPos = espnPosition.toUpperCase().trim()
  const fantasyPos = fantasyPosition.toUpperCase().trim()

  // Exact match after normalization
  if (normalizePosition(espnPos) === normalizePosition(fantasyPos)) {
    return true
  }

  // Edge rushers can go both ways
  if (fantasyPos === "DL" && espnPos === "LB") return true
  if (fantasyPos === "LB" && (espnPos === "DE" || espnPos === "DT")) return true

  // Hybrid QB/TE (Taysom Hill)
  if ((fantasyPos === "QB" && espnPos === "TE") || (fantasyPos === "TE" && espnPos === "QB")) {
    return true
  }

  // Defensive backs
  if (fantasyPos === "DB" && (espnPos === "CB" || espnPos === "S")) return true

  // Fullbacks as running backs
  if (fantasyPos === "RB" && espnPos === "FB") return true

  return false
}

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------

async function scrapeFantasyProsRankings(
  position: string,
  topN: number,
): Promise<FantasyPlayer[]> {
  const fpPosition = FANTASYPROS_POSITIONS[position]
  if (!fpPosition) {
    console.log(`Warning: Position ${position} not mapped for FantasyPros`)
    return []
  }

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

    // Find the stats table
    const table = $("#data, table.table").first()
    if (!table.length) {
      console.log(`  Warning: Could not find stats table for ${position}`)
      return []
    }

    const tbody = table.find("tbody")
    if (!tbody.length) {
      console.log(`  Warning: Could not find tbody for ${position}`)
      return []
    }

    const rows = tbody.find("tr")
    rows.slice(0, topN).each((idx, row) => {
      try {
        const $row = $(row)
        // Find player cell
        let playerCell = $row.find("td.player-label, a.fp-player-link").first()

        if (!playerCell.length) {
          // Fallback to first td
          playerCell = $row.find("td").first()
        }

        if (playerCell.length) {
          const fullText = playerCell.text().trim()

          // Extract team from parentheses if present
          let team: string | null = null
          let playerName = fullText

          if (fullText.includes("(") && fullText.includes(")")) {
            playerName = fullText.split("(")[0].trim()
            const teamPart = fullText.split("(")[1].split(")")[0].trim()
            // Team is usually first part before any dash
            team = teamPart.split("-")[0].trim()
          }

          if (playerName) {
            players.push({
              rank: idx + 1,
              name: playerName,
              position: position,
              team: team,
            })
          }
        }
      } catch (err) {
        console.log(`  Error parsing row ${idx + 1} for ${position}: ${err}`)
      }
    })

    console.log(`  Found ${players.length} ${position} players`)
    return players
  } catch (err) {
    console.error(`  Error fetching ${position} stats: ${err}`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function loadNFLPlayers(): NFLPlayer[] {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const playersPath = resolve(__dirname, "..", "src", "data", "players.json")
  const data = readFileSync(playersPath, "utf-8")
  return JSON.parse(data)
}

function validateAgainstNFLDatabase(
  fantasyPlayers: FantasyPlayer[],
  nflPlayers: NFLPlayer[],
): FantasyPlayer[] | null {
  console.log("\nValidating fantasy players against NFL database...")

  // Create a lookup dictionary - track ALL matching players per normalized name
  const nflLookup = new Map<string, NFLPlayer[]>()
  for (const player of nflPlayers) {
    const name = normalizeName(player.name)
    if (!nflLookup.has(name)) {
      nflLookup.set(name, [])
    }
    nflLookup.get(name)!.push(player)
  }

  // Check for duplicates in NFL database
  const duplicateNames: string[] = []
  for (const [name, players] of nflLookup.entries()) {
    if (players.length > 1) {
      // Check if they have the same espnId (true duplicate)
      const espnIds = new Set(players.map(p => p.espnId))
      if (espnIds.size < players.length) {
        duplicateNames.push(name)
      }
    }
  }

  if (duplicateNames.length > 0) {
    console.error(`\n  ❌ ERROR: Found ${duplicateNames.length} duplicate players in NFL database!`)
    console.error(`  Players with duplicate espnIds:`)
    duplicateNames.slice(0, 20).forEach(name => {
      const players = nflLookup.get(name)!
      const espnIds = players.map(p => p.espnId).join(', ')
      console.error(`    - "${name}" (espnIds: ${espnIds})`)
    })
    if (duplicateNames.length > 20) {
      console.error(`    ... and ${duplicateNames.length - 20} more`)
    }
    console.error(`\n  Please run the deduplication script before scraping fantasy rankings.`)
    return null
  }

  const validatedPlayers: FantasyPlayer[] = []
  const unmatchedPlayers: FantasyPlayer[] = []

  for (const fp of fantasyPlayers) {
    const name = normalizeName(fp.name)
    const fantasyPosition = fp.position.toUpperCase().trim()

    // Check direct name match first
    let nflMatches = nflLookup.get(name)

    // If not found, check nickname mapping
    if (!nflMatches && NICKNAME_MAP[name]) {
      const mappedName = NICKNAME_MAP[name]
      nflMatches = nflLookup.get(mappedName)
    }

    // Check if player name exists and if any ESPN positions are compatible
    if (nflMatches && nflMatches.some(p => positionsAreCompatible(p.position, fantasyPosition))) {
      validatedPlayers.push(fp)
    } else {
      unmatchedPlayers.push(fp)
    }
  }

  console.log(`  ✓ Matched: ${validatedPlayers.length}/${fantasyPlayers.length} players`)

  if (unmatchedPlayers.length > 0) {
    console.log(`  ✗ Unmatched: ${unmatchedPlayers.length} players`)
    console.log("\n  Players not found in NFL database:")
    unmatchedPlayers.slice(0, 10).forEach(p => {
      console.log(`    - ${p.name} (${p.position})`)
    })
    if (unmatchedPlayers.length > 10) {
      console.log(`    ... and ${unmatchedPlayers.length - 10} more`)
    }
  }

  return validatedPlayers
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "fantasy_players.json")

  console.log("Fantasy Rankings Scraper")
  console.log("=".repeat(50))
  console.log(`Positions to scrape:`, POSITIONS_CONFIG)
  console.log()

  // Load NFL players database for validation
  console.log("Loading NFL players database...")
  const nflPlayers = loadNFLPlayers()
  console.log(`  Loaded ${nflPlayers.length} NFL players`)
  console.log()

  // Scrape each position
  const allFantasyPlayers: FantasyPlayer[] = []

  for (const [position, count] of Object.entries(POSITIONS_CONFIG)) {
    const players = await scrapeFantasyProsRankings(position, count)
    allFantasyPlayers.push(...players)
    // Rate limit between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log()
  console.log(`Total fantasy players scraped: ${allFantasyPlayers.length}`)

  // Count how many have team info
  const withTeam = allFantasyPlayers.filter(p => p.team).length
  console.log(`  ${withTeam}/${allFantasyPlayers.length} players have team data`)

  // Validate against NFL database
  const validatedPlayers = validateAgainstNFLDatabase(allFantasyPlayers, nflPlayers)

  // Exit if validation detected duplicates
  if (validatedPlayers === null) {
    console.error("\n❌ Aborting: Cannot save fantasy rankings with duplicate players in database")
    process.exit(1)
  }

  // Save to output file
  writeFileSync(outputPath, JSON.stringify(validatedPlayers, null, 2) + "\n", "utf-8")

  console.log()
  console.log(`✓ Fantasy player database saved to ${outputPath}`)
  console.log(`  Total players: ${validatedPlayers.length}`)

  // Print summary by position
  console.log("\nBreakdown by position:")
  for (const position of Object.keys(POSITIONS_CONFIG)) {
    const posCount = validatedPlayers.filter(p => p.position === position).length
    const posWithTeam = validatedPlayers.filter(p => p.position === position && p.team).length
    console.log(`  ${position}: ${posCount} players (${posWithTeam} with team)`)
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
