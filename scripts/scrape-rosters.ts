#!/usr/bin/env tsx
/**
 * Scrape NFL rosters from ESPN depth chart pages (Puppeteer) supplemented by
 * the ESPN roster JSON API for jersey numbers. Outputs src/data/players.json.
 */

import puppeteer, { type Page } from "puppeteer"
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

interface DepthEntry {
  espnId: string
  name: string
  position: string
  depthRank: number
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
  depthChart: number | null
}

// ---------------------------------------------------------------------------
// Build TEAMS array from teams.json
// ---------------------------------------------------------------------------

const TEAMS: Team[] = Object.entries(teamsData).map(([id, t]) => ({
  id: Number(id),
  ...(t as Omit<Team, "id">),
}))

// Positions to skip from depth charts (return specialists cause duplicates)
const SKIP_POSITIONS = new Set(["PR", "KR", "H"])

// Normalize granular ESPN positions to general positions
const POSITION_MAP: Record<string, string> = {
  LDE: "DE",
  RDE: "DE",
  LDT: "DT",
  RDT: "DT",
  WLB: "LB",
  MLB: "LB",
  SLB: "LB",
  LCB: "CB",
  RCB: "CB",
  NB: "CB",
  SS: "S",
  FS: "S",
  PK: "K",
  LG: "OG",
  RG: "OG",
  LT: "OT",
  RT: "OT",
}

// ---------------------------------------------------------------------------
// Scrape depth chart page with Puppeteer
// ---------------------------------------------------------------------------

async function scrapeDepthChart(page: Page, team: Team): Promise<DepthEntry[]> {
  const url = `https://www.espn.com/nfl/team/depth/_/name/${team.abbr}/${team.slug}`
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
  // Wait for tables to render
  await page.waitForSelector("table", { timeout: 10_000 }).catch(() => {})

  const entries = await page.evaluate(() => {
    const results: { espnId: string; name: string; position: string; colIndex: number }[] = []

    // ESPN uses a split-table layout: each ResponsiveTable container has
    // a fixed-left table (position labels) and a scrollable table (players).
    const containers = document.querySelectorAll(".ResponsiveTable")

    for (const container of containers) {
      const posTable = container.querySelector("table.Table--fixed-left")
      const playerTable = container.querySelector("table:not(.Table--fixed-left)")
      if (!posTable || !playerTable) continue

      // Build a map of data-idx -> position text from the left table
      const posMap = new Map<string, string>()
      for (const row of posTable.querySelectorAll("tr[data-idx]")) {
        const idx = row.getAttribute("data-idx") ?? ""
        // Position text is in a span inside the single td; strip any
        // trailing injury-status span content by reading only the first text node
        const span = row.querySelector("span[data-testid='statCell']")
        const pos = span?.childNodes[0]?.textContent?.trim() ?? ""
        if (pos) posMap.set(idx, pos)
      }

      // Walk the player table rows and pair with positions via data-idx
      for (const row of playerTable.querySelectorAll("tr[data-idx]")) {
        const idx = row.getAttribute("data-idx") ?? ""
        const position = posMap.get(idx)
        if (!position) continue

        const cells = Array.from(row.querySelectorAll("td"))
        for (let col = 0; col < cells.length; col++) {
          const cell = cells[col]
          const link = cell.querySelector(
            'a[href*="/nfl/player/_/id/"]',
          ) as HTMLAnchorElement | null
          if (!link) continue

          const href = link.getAttribute("href") ?? ""
          const idMatch = href.match(/\/id\/(\d+)\//)
          if (!idMatch) continue

          // Strip trailing injury/status designations (Q, IR, O, D, PUP, SUSP)
          const rawName = link.textContent?.trim() ?? ""
          const name = rawName.replace(/\s+(Q|IR|O|D|PUP|SUSP|CEL|DNR|NFI)$/i, "").trim()
          if (!name) continue

          results.push({
            espnId: idMatch[1],
            name,
            position,
            colIndex: col + 1, // 1-based: Starter=1, 2nd=2, etc.
          })
        }
      }
    }

    return results
  })

  // Assign depth ranks: group by position, colIndex 1 = rank 1 (starter), etc.
  // Filter out return specialist positions
  const filtered: DepthEntry[] = []
  for (const e of entries) {
    if (SKIP_POSITIONS.has(e.position)) continue
    const pos = POSITION_MAP[e.position] ?? e.position
    filtered.push({
      espnId: e.espnId,
      name: e.name,
      position: pos,
      depthRank: e.colIndex, // col 1 = starter (rank 1)
    })
  }

  return filtered
}

// ---------------------------------------------------------------------------
// Fetch roster API for jersey numbers
// ---------------------------------------------------------------------------

async function fetchRosterApi(team: Team): Promise<RosterEntry[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`
  const entries: RosterEntry[] = []

  try {
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
// Merge depth chart + roster API data
// ---------------------------------------------------------------------------

function mergeTeamData(
  depthEntries: DepthEntry[],
  rosterEntries: RosterEntry[],
  team: Team,
): OutputPlayer[] {
  // Build lookup maps from roster API by ESPN ID
  const rosterById = new Map<string, RosterEntry>()
  for (const r of rosterEntries) rosterById.set(r.espnId, r)

  // Track which ESPN IDs we've already added (from depth chart)
  const seen = new Set<string>()
  const players: OutputPlayer[] = []

  // First pass: depth chart players (they get depthChart values)
  for (const d of depthEntries) {
    if (seen.has(d.espnId)) continue
    seen.add(d.espnId)

    const roster = rosterById.get(d.espnId)
    const number = roster?.number ?? 0

    players.push({
      espnId: d.espnId,
      teamId: team.id,
      name: d.name,
      position: d.position,
      number,
      depthChart: d.depthRank,
    })
  }

  // Second pass: roster-only players not on depth chart
  for (const r of rosterEntries) {
    if (seen.has(r.espnId)) continue
    seen.add(r.espnId)

    players.push({
      espnId: r.espnId,
      teamId: team.id,
      name: r.name,
      position: r.position,
      number: r.number,
      depthChart: null,
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

function getTeamMeta(teamId: number): Team {
  return TEAMS.find(t => t.id === teamId)!
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const page = await browser.newPage()

  // Block images, CSS, fonts for speed
  await page.setRequestInterception(true)
  page.on("request", req => {
    const type = req.resourceType()
    if (["image", "stylesheet", "font", "media"].includes(type)) {
      req.abort()
    } else {
      req.continue()
    }
  })

  const allPlayers: OutputPlayer[] = []
  const teamCounts: Record<string, number> = {}

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    process.stdout.write(`[${i + 1}/${teams.length}] ${team.name}...`)

    try {
      // Scrape depth chart and fetch roster API in parallel
      const [depthEntries, rosterEntries] = await Promise.all([
        scrapeDepthChart(page, team),
        fetchRosterApi(team),
      ])

      const players = mergeTeamData(depthEntries, rosterEntries, team)

      allPlayers.push(...players)
      teamCounts[team.name] = players.length

      console.log(
        ` depth: ${depthEntries.length}, api: ${rosterEntries.length}, merged: ${players.length}`,
      )
    } catch (err) {
      console.error(` ERROR: ${err}`)
      teamCounts[team.name] = 0
    }

    // Rate limit between teams
    if (i < teams.length - 1) await delay(1500)
  }

  await browser.close()

  // Sort: conference, division, team, name
  allPlayers.sort((a, b) => {
    const aTeam = getTeamMeta(a.teamId)
    const bTeam = getTeamMeta(b.teamId)
    return (
      aTeam.conference.localeCompare(bTeam.conference) ||
      aTeam.division.localeCompare(bTeam.division) ||
      aTeam.name.localeCompare(bTeam.name) ||
      a.name.localeCompare(b.name)
    )
  })

  writeFileSync(outputPath, JSON.stringify(allPlayers, null, 2) + "\n", "utf-8")

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
