#!/usr/bin/env tsx

// Scrapes Madden 26 player ratings from EA's official ratings site.
// The previous source (muthead.com) no longer publishes Madden 26 and is now a
// JS-rendered SPA. EA's ratings page server-renders a clean JSON copy of the
// player list into the HTML ("ratingDetails":{"items":[…]}), 100 players per
// page (?page=N), sorted by overall — so the first pages give the top-rated
// players at each position.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

interface NflPlayer {
  id: string
  name: string
  conference: string
  division: string
  team: string
  teamAbbr: string
  position: string
  number: number
  numberBackfilled?: boolean
}

interface EaRow {
  name: string
  position: string
  teamAbbr: string
  ovr: number
  spd: number
  awr: number
  str: number
}

interface MaddenPlayer extends NflPlayer {
  ovr: number
  spd: number
  awr: number
  str: number
}

const MIN_CURATED_ANSWER_POOL_SIZE = 150
const MAX_PAGES = 40

// Madden Playerdle only uses skill-position players, matching the standard NFL game.
// Each position is capped at the same "top X" counts the classic answer pool targets.
const POSITION_LIMITS: Record<string, number> = { QB: 35, RB: 75, WR: 75, TE: 30 }
const SKILL_POSITIONS = new Set(Object.keys(POSITION_LIMITS))

// EA labels running backs "HB" (halfback); the roster uses "RB".
const POSITION_ALIASES: Record<string, string> = { HB: "RB" }

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.'`\-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Bracket-match the JSON array starting at `[` in `text`, respecting strings. */
function sliceJsonArray(text: string, openIndex: number): string | null {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === "\\") esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === "[") depth++
    else if (c === "]") {
      depth--
      if (depth === 0) return text.slice(openIndex, i + 1)
    }
  }
  return null
}

interface EaItem {
  firstName?: string
  lastName?: string
  overallRating?: number
  position?: { id?: string; shortLabel?: string }
  team?: { abbreviation?: string; shortLabel?: string; label?: string }
  stats?: Record<string, { value?: number }>
}

async function fetchEaPage(page: number): Promise<EaRow[]> {
  const url = `https://www.ea.com/games/madden-nfl/ratings?page=${page}`
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`EA request failed page ${page}: HTTP ${response.status}`)

  // The page server-renders a clean JSON copy of the player list into the HTML.
  const html = await response.text()
  const key = '"ratingDetails":{"items":'
  const k = html.indexOf(key)
  if (k < 0) return []
  const arrStart = html.indexOf("[", k)
  const raw = arrStart >= 0 ? sliceJsonArray(html, arrStart) : null
  if (!raw) return []

  let items: EaItem[]
  try {
    items = JSON.parse(raw) as EaItem[]
  } catch {
    return []
  }

  const rows: EaRow[] = []
  for (const it of items) {
    const name = `${it.firstName ?? ""} ${it.lastName ?? ""}`.trim()
    const rawPosition = (it.position?.shortLabel ?? it.position?.id ?? "").toUpperCase()
    const position = POSITION_ALIASES[rawPosition] ?? rawPosition
    const teamAbbr = it.team?.abbreviation ?? it.team?.shortLabel ?? ""
    const ovr = it.overallRating
    const spd = it.stats?.speed?.value
    const awr = it.stats?.awareness?.value
    const str = it.stats?.strength?.value
    if (!name || ovr == null || spd == null || awr == null || str == null) continue
    rows.push({ name, position, teamAbbr, ovr, spd, awr, str })
  }
  return rows
}

function loadNflPlayers(): NflPlayer[] {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = resolve(dir, "..", "packages", "data", "src", "playerdle", "nfl", "players.json")
  return JSON.parse(readFileSync(path, "utf-8")) as NflPlayer[]
}

function loadClassicAnswerPoolIds(): Set<string> {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = resolve(dir, "..", "packages", "data", "src", "playerdle", "nfl", "answer_pool.json")
  return new Set(JSON.parse(readFileSync(path, "utf-8")) as string[])
}

/** Match EA rows to roster players (by name + position), keeping the top X per position by OVR. */
function buildMaddenPlayers(nflPlayers: NflPlayer[], eaRows: EaRow[]): MaddenPlayer[] {
  const byName = new Map<string, EaRow[]>()
  for (const row of eaRows) {
    const key = normalizeName(row.name)
    const list = byName.get(key)
    if (list) list.push(row)
    else byName.set(key, [row])
  }

  const matched: MaddenPlayer[] = []
  const usedRows = new Set<EaRow>()
  for (const player of nflPlayers) {
    if (!SKILL_POSITIONS.has(player.position)) continue
    const candidates = byName.get(normalizeName(player.name))
    if (!candidates) continue
    const row =
      candidates.find(c => !usedRows.has(c) && c.position === player.position) ??
      candidates.find(c => c.position === player.position)
    if (!row) continue
    usedRows.add(row)
    matched.push({ ...player, ovr: row.ovr, spd: row.spd, awr: row.awr, str: row.str })
  }

  // Keep only the top X per position by overall.
  const byPosition = new Map<string, MaddenPlayer[]>()
  for (const p of matched) {
    const list = byPosition.get(p.position)
    if (list) list.push(p)
    else byPosition.set(p.position, [p])
  }
  const result: MaddenPlayer[] = []
  for (const [position, list] of byPosition) {
    list.sort((a, b) => b.ovr - a.ovr)
    result.push(...list.slice(0, POSITION_LIMITS[position] ?? list.length))
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

function buildCuratedAnswerPool(
  players: MaddenPlayer[],
  classicAnswerPoolIds: Set<string>,
): string[] {
  const curated = players.filter(p => classicAnswerPoolIds.has(p.id))
  if (curated.length >= MIN_CURATED_ANSWER_POOL_SIZE) return curated.map(p => p.id)

  const curatedIds = new Set(curated.map(p => p.id))
  const fallback = players
    .filter(p => !curatedIds.has(p.id))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, MIN_CURATED_ANSWER_POOL_SIZE - curated.length)
  return [...curated, ...fallback].map(p => p.id)
}

function writeData(players: MaddenPlayer[], answerPoolIds: string[]) {
  const dir = dirname(fileURLToPath(import.meta.url))
  const base = resolve(dir, "..", "packages", "data", "src", "playerdle", "nfl")
  writeFileSync(resolve(base, "madden_players.json"), `${JSON.stringify(players, null, 2)}\n`)
  writeFileSync(
    resolve(base, "madden_answer_pool.json"),
    `${JSON.stringify(answerPoolIds, null, 2)}\n`,
  )
  console.log(`Saved ${players.length} Madden players and ${answerPoolIds.length} answer IDs`)
}

function quotasMet(rows: EaRow[]): boolean {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    if (SKILL_POSITIONS.has(r.position)) counts[r.position] = (counts[r.position] ?? 0) + 1
  }
  return Object.entries(POSITION_LIMITS).every(([pos, limit]) => (counts[pos] ?? 0) >= limit)
}

async function main() {
  console.log("NFL Madden 26 Ratings Scraper (ea.com)")
  console.log("=".repeat(50))

  const nflPlayers = loadNflPlayers()
  const classicAnswerPoolIds = loadClassicAnswerPoolIds()
  console.log(
    `Loaded ${nflPlayers.length} NFL players, ${classicAnswerPoolIds.size} classic answer IDs`,
  )

  const allRows: EaRow[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await fetchEaPage(page)
    if (rows.length === 0) {
      console.log(`No rows on page ${page}, stopping`)
      break
    }
    allRows.push(...rows)
    console.log(`Page ${page}: ${rows.length} rows (total: ${allRows.length})`)
    // Stop once we have enough skill players to fill every position quota.
    if (quotasMet(allRows)) {
      console.log("Position quotas met, stopping")
      break
    }
    await new Promise(r => setTimeout(r, 600))
  }
  console.log(`Total rows fetched: ${allRows.length}`)

  const maddenPlayers = buildMaddenPlayers(nflPlayers, allRows)
  if (maddenPlayers.length < 100) {
    throw new Error(
      `Refusing to write: only ${maddenPlayers.length} Madden players built (source likely changed). Existing data left untouched.`,
    )
  }
  const answerPoolIds = buildCuratedAnswerPool(maddenPlayers, classicAnswerPoolIds)
  const counts: Record<string, number> = {}
  for (const p of maddenPlayers) counts[p.position] = (counts[p.position] ?? 0) + 1
  console.log(`Built ${maddenPlayers.length} Madden players`, counts)
  console.log(`Selected ${answerPoolIds.length} curated answer IDs`)

  writeData(maddenPlayers, answerPoolIds)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
