#!/usr/bin/env tsx
/**
 * Scrape NFL rosters from ESPN roster JSON API.
 * Outputs src/data/players.json.
 */

import { writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import teamsData from "../src/data/teams.json" with { type: "json" }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Team {
  id: number
  abbr: string
  slug: string
  name: string
  conference: "AFC" | "NFC"
  division: string
}

interface RosterEntry {
  espnId: string
  name: string
  number: number
  position: string
}

interface OutputPlayer {
  espnId: string | null
  teamId: number
  name: string
  position: string
  number: number
}

// ---------------------------------------------------------------------------
// Build TEAMS array from teams.json
// ---------------------------------------------------------------------------

const TEAMS: Team[] = Object.entries(teamsData).map(([id, t]) => ({
  id: Number(id),
  ...(t as Omit<Team, "id">),
}))

// ---------------------------------------------------------------------------
// Fetch roster API for jersey numbers
// ---------------------------------------------------------------------------

async function fetchRosterApi(team: Team): Promise<RosterEntry[]> {
  // ESPN team IDs don't match our sequential IDs - use abbr-based lookup instead
  // We'll fetch the team info from ESPN's teams endpoint first
  const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
  const entries: RosterEntry[] = []

  try {
    // First, get the correct ESPN team ID by matching abbreviation
    const teamsResp = await fetch(teamsUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!teamsResp.ok) throw new Error(`Teams API HTTP ${teamsResp.status}`)
    const teamsData = await teamsResp.json()

    const espnTeam = teamsData.sports?.[0]?.leagues?.[0]?.teams?.find(
      (t: any) => t.team?.abbreviation?.toLowerCase() === team.abbr.toLowerCase()
    )

    if (!espnTeam) {
      throw new Error(`Could not find ESPN team ID for ${team.abbr}`)
    }

    const espnTeamId = espnTeam.team.id
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/roster`

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    for (const group of data.athletes ?? []) {
      for (const athlete of group.items ?? []) {
        const name: string = athlete.displayName ?? athlete.fullName ?? ""
        const jersey = athlete.jersey
        const position: string = athlete.position?.abbreviation ?? ""
        const espnId: string = String(athlete.id ?? "")
        const num = Number(jersey)
        if (!name || !espnId || Number.isNaN(num)) continue

        entries.push({ espnId, name, number: num, position })
      }
    }
  } catch (err) {
    console.error(`  WARNING: Roster API failed for ${team.name}: ${err}`)
  }

  return entries
}

// ---------------------------------------------------------------------------
// Convert roster API data to output format
// ---------------------------------------------------------------------------

function convertRosterData(
  rosterEntries: RosterEntry[],
  team: Team,
): OutputPlayer[] {
  const players: OutputPlayer[] = []

  for (const r of rosterEntries) {
    players.push({
      espnId: r.espnId,
      teamId: team.id,
      name: r.name,
      position: r.position,
      number: r.number,
    })
  }

  return players
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(__dirname, "..", "src", "data", "players.json")

  const testMode = process.argv.includes("--test")
  const teams = testMode ? TEAMS.filter(t => t.abbr === "gb") : TEAMS

  if (testMode) {
    console.log(`TEST MODE: scraping only ${teams[0].name}\n`)
  } else {
    console.log(`Scraping rosters for ${teams.length} NFL teams...\n`)
  }

  const allPlayers: OutputPlayer[] = []
  const teamCounts: Record<string, number> = {}
  const globalSeenIds = new Set<string>() // Track ESPN IDs globally to prevent duplicates

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    process.stdout.write(`[${i + 1}/${teams.length}] ${team.name}...`)

    try {
      // Fetch roster API only (no depth chart)
      const rosterEntries = await fetchRosterApi(team)

      const players = convertRosterData(rosterEntries, team)

      // Only add players we haven't seen before
      const newPlayers = players.filter(p => {
        if (!p.espnId || globalSeenIds.has(p.espnId)) return false
        globalSeenIds.add(p.espnId)
        return true
      })

      allPlayers.push(...newPlayers)
      teamCounts[team.name] = newPlayers.length

      const skipped = players.length - newPlayers.length
      console.log(
        ` api: ${rosterEntries.length}, total: ${players.length}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}`,
      )
    } catch (err) {
      console.error(` ERROR: ${err}`)
      teamCounts[team.name] = 0
    }

    // Rate limit between teams
    if (i < teams.length - 1) await delay(1500)
  }

  // Sort by ESPN ID
  allPlayers.sort((a, b) => {
    const aId = Number(a.espnId) || 0
    const bId = Number(b.espnId) || 0
    return aId - bId
  })

  // Sort object properties alphabetically
  const sortedPlayers = allPlayers.map(player => {
    const sorted: any = {}
    Object.keys(player).sort().forEach(key => {
      sorted[key] = player[key as keyof OutputPlayer]
    })
    return sorted
  })

  writeFileSync(outputPath, JSON.stringify(sortedPlayers, null, 2) + "\n", "utf-8")

  console.log("\n--- Summary ---")
  for (const name of Object.keys(teamCounts).sort()) {
    console.log(`  ${name}: ${teamCounts[name]} players`)
  }
  console.log(`\n  Total: ${allPlayers.length} players`)
  console.log(`  Wrote ${allPlayers.length} players to ${outputPath}`)
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
