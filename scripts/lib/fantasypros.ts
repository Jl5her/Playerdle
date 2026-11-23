// FantasyPros NFL season stats (https://www.fantasypros.com/nfl/stats/<pos>.php).
//
// Since Oct 2026 the stats pages no longer render an HTML <table>; the data is
// embedded as JSON in `window.FP.reportConfig = {...}` (rows under `table.rows`,
// already sorted by fantasy points, half-PPR scoring by default). Any fetch or
// parse problem throws, so callers never mistake a broken page for "no players".

const REPORT_CONFIG_MARKER = "window.FP.reportConfig ="

const TEAM_ABBR_MAP: Record<string, string> = {
  JAC: "JAX",
}

export interface FantasyProsStatRow {
  name: string
  /** Team abbreviation (normalized, e.g. JAC → JAX); undefined for free agents */
  team?: string
  /** Position as listed by FantasyPros (e.g. "DE" on the DL page) */
  pos: string
  games: number
  /** Total fantasy points (half-PPR) */
  fpts: number
  /** Fantasy points per game (half-PPR) */
  fptsg: number
  /** Raw numeric stat fields, e.g. rec_att (targets), rec_rec, rec_yds, rush_tds */
  stats: Record<string, number>
}

interface RawRow {
  player?: { name?: unknown; team?: unknown }
  pos?: unknown
  [key: string]: unknown
}

/** Extracts the first JSON value following `marker`, respecting strings and nesting. */
function extractJsonAfter(html: string, marker: string): unknown {
  const markerIndex = html.indexOf(marker)
  if (markerIndex === -1) {
    throw new Error(`"${marker}" not found — FantasyPros page format changed?`)
  }
  let start = markerIndex + marker.length
  while (/\s/.test(html[start] ?? "")) start++
  if (html[start] !== "{") throw new Error("reportConfig is not a JSON object")

  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const char = html[i]
    if (inString) {
      if (char === "\\") i++
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
    } else if (char === "{" || char === "[") {
      depth++
    } else if (char === "}" || char === "]") {
      depth--
      if (depth === 0) return JSON.parse(html.slice(start, i + 1))
    }
  }
  throw new Error("Unterminated reportConfig JSON")
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

/**
 * Fetches season stats for one position page ("qb", "rb", "wr", "te", "k", "dl", "lb", "db"),
 * ordered by total fantasy points (descending).
 */
export async function fetchFantasyProsStats(
  position: string,
  season: number,
): Promise<FantasyProsStatRow[]> {
  const url = `https://www.fantasypros.com/nfl/stats/${position.toLowerCase()}.php?year=${season}&range=full`
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`FantasyPros ${position.toUpperCase()} ${season}: HTTP ${response.status}`)
  }

  const config = extractJsonAfter(await response.text(), REPORT_CONFIG_MARKER) as {
    table?: { rows?: RawRow[] }
  }
  const rawRows = config.table?.rows
  if (!Array.isArray(rawRows)) {
    throw new Error(
      `FantasyPros ${position.toUpperCase()} ${season}: no table.rows in reportConfig`,
    )
  }

  const rows: FantasyProsStatRow[] = []
  for (const raw of rawRows) {
    const name = typeof raw.player?.name === "string" ? raw.player.name.trim() : ""
    if (!name) continue
    const rawTeam = typeof raw.player?.team === "string" ? raw.player.team.trim().toUpperCase() : ""
    const stats: Record<string, number> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "number") stats[key] = value
    }
    rows.push({
      name,
      team: rawTeam && rawTeam !== "FA" ? (TEAM_ABBR_MAP[rawTeam] ?? rawTeam) : undefined,
      pos: typeof raw.pos === "string" ? raw.pos : position.toUpperCase(),
      games: toNumber(raw.games),
      fpts: toNumber(raw.fpts),
      fptsg: toNumber(raw.fptsg),
      stats,
    })
  }

  return rows.sort((a, b) => b.fpts - a.fpts)
}
