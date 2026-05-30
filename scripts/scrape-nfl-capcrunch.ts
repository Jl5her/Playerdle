#!/usr/bin/env tsx
/**
 * Builds NFL Cap Crunch data and writes to
 * packages/data/src/capcrunch/nfl-capcrunch.json
 *
 * Data source: nflverse historical_contracts.csv.gz (GitHub release, publicly
 * accessible). The dataset covers contracts through 2022; POST_2022_OVERRIDES
 * patches in significant 2023-2025 extensions and roster changes.
 *
 * All WR slots are provided via overrides (nflverse WR data is too stale).
 * QB, RB, TE, and OL fall through to nflverse where not overridden.
 *
 * Usage:
 *   pnpm scrape:nfl:capcrunch                  # build/update nfl-capcrunch.json
 *   pnpm scrape:nfl:capcrunch -- --year=2025   # tag output with specific season
 *   pnpm scrape:nfl:capcrunch -- --dry-run     # print result, don't write file
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ---- Config ----------------------------------------------------------------

function parseArgs(): { year: number; dryRun: boolean } {
  const yearArg = process.argv.find(a => a.startsWith("--year="))
  const year = yearArg ? Number(yearArg.split("=")[1]) : new Date().getFullYear()
  const dryRun = process.argv.includes("--dry-run")
  return { year, dryRun }
}

// nflverse uses full nicknames for single-team contracts and slash-separated
// uppercase abbreviations for traded players (e.g. "LAR/DET").
const TEAM_NAME_TO_ID: Record<string, string> = {
  "49ers": "sf",
  Bears: "chi",   Bengals: "cin",    Bills: "buf",    Broncos: "den",
  Browns: "cle",  Buccaneers: "tb",  Cardinals: "ari",Chargers: "lac",
  Chiefs: "kc",   Colts: "ind",      Commanders: "was",Cowboys: "dal",
  Dolphins: "mia",Eagles: "phi",     Falcons: "atl",  Giants: "nyg",
  Jaguars: "jax", Jets: "nyj",       Lions: "det",    Packers: "gb",
  Panthers: "car",Patriots: "ne",    Raiders: "lv",   Rams: "lar",
  Ravens: "bal",  Saints: "no",      Seahawks: "sea", Steelers: "pit",
  Texans: "hou",  Titans: "ten",     Vikings: "min",
  // Abbreviations (multi-team slash entries)
  ARI: "ari", ATL: "atl", BAL: "bal", BUF: "buf",
  CAR: "car", CHI: "chi", CIN: "cin", CLE: "cle",
  DAL: "dal", DEN: "den", DET: "det", GB: "gb",   GNB: "gb",
  HOU: "hou", IND: "ind", JAX: "jax", JAC: "jax",
  KC: "kc",   KAN: "kc",  LAC: "lac", LAR: "lar", LA: "lar",
  LV: "lv",   LVR: "lv",  OAK: "lv",  MIA: "mia", MIN: "min",
  NE: "ne",   NWE: "ne",  NO: "no",   NOR: "no",
  NYG: "nyg", NYJ: "nyj", PHI: "phi", PIT: "pit",
  SEA: "sea", SF: "sf",   SFO: "sf",  TB: "tb",   TAM: "tb",
  TEN: "ten", WAS: "was", WSH: "was",
}

function resolveTeamId(raw: string): string | null {
  const parts = raw.trim().split("/")
  const last = parts[parts.length - 1]?.trim() ?? ""
  return TEAM_NAME_TO_ID[last] ?? null
}

// ---- Post-2022 overrides ---------------------------------------------------
// The nflverse snapshot only covers contracts signed through 2022.
// These entries supersede the baseline for players who signed new deals in
// 2023-2025 or changed teams since the snapshot.
//
// ALL WR slots (WR/WR2/WR3) are overridden for every team because nflverse
// WR data is too stale to use reliably.
//
// Keys: teamId → position code → { name, apy }
// Position codes: QB, RB, TE, WR, WR2, WR3, LT, LG, C, RG, RT

interface Override { name: string; apy: number }

const POST_2022_OVERRIDES: Record<string, Partial<Record<string, Override>>> = {
  ari: {
    QB:  { name: "Kyler Murray",          apy: 46_100_000 }, // 2022 5yr/$230.5M
    TE:  { name: "Trey McBride",          apy: 14_900_000 }, // 2024 extension
    WR:  { name: "Marvin Harrison Jr.",   apy:  7_600_000 }, // 2024 rookie
    WR2: { name: "Michael Wilson",        apy:  3_000_000 }, // 2023 rookie
    WR3: { name: "Rondale Moore",         apy:  2_000_000 },
  },
  atl: {
    QB:  { name: "Kirk Cousins",          apy: 45_000_000 }, // 2024 4yr/$180M
    LG:  { name: "Chris Lindstrom",       apy: 23_000_000 }, // 2023 5yr/$115M (moved from RG)
    RG:  { name: "Matthew Bergeron",      apy:  1_400_000 }, // 2024 rookie
    WR:  { name: "Drake London",          apy: 23_500_000 }, // 2024 extension
    WR2: { name: "Darnell Mooney",        apy:  6_000_000 }, // 2023 2yr/$11.5M
    WR3: { name: "Ray-Ray McCloud III",   apy:  2_000_000 },
  },
  bal: {
    QB:  { name: "Lamar Jackson",         apy: 52_000_000 }, // 2023 5yr/$260M
    RB:  { name: "Derrick Henry",         apy:  8_000_000 }, // 2024 1yr
    C:   { name: "Tyler Linderbaum",      apy: 16_000_000 }, // 2024 extension
    WR:  { name: "Zay Flowers",           apy:  8_000_000 }, // 2024 extension
    WR2: { name: "Rashod Bateman",        apy:  3_200_000 },
    WR3: { name: "Nelson Agholor",        apy:  4_000_000 }, // 2023 1yr
  },
  buf: {
    QB:  { name: "Josh Allen",            apy: 43_000_000 }, // 2021 6yr/$258M
    WR:  { name: "Khalil Shakir",         apy: 16_000_000 }, // 2024 extension
    WR2: { name: "Curtis Samuel",         apy:  5_000_000 }, // 2023 FA
    WR3: { name: "Keon Coleman",          apy:  1_900_000 }, // 2024 rookie
  },
  car: {
    WR:  { name: "Diontae Johnson",       apy: 18_000_000 }, // 2023 extension (traded to CAR)
    WR2: { name: "Adam Thielen",          apy:  6_000_000 }, // 2023 FA
    WR3: { name: "Jonathan Mingo",        apy:  1_200_000 }, // 2023 rookie
  },
  chi: {
    QB:  { name: "Caleb Williams",        apy: 11_400_000 }, // 2024 rookie
    WR:  { name: "D.J. Moore",            apy: 18_000_000 }, // 2023 trade/extension
    WR2: { name: "Rome Odunze",           apy:  4_200_000 }, // 2024 rookie
    WR3: { name: "Velus Jones Jr.",       apy:  1_000_000 },
  },
  cin: {
    QB:  { name: "Joe Burrow",            apy: 55_000_000 }, // 2023 5yr/$275M
    WR:  { name: "Ja'Marr Chase",         apy: 35_000_000 }, // 2024 extension
    WR2: { name: "Tee Higgins",           apy: 21_600_000 }, // 2024 deal
    WR3: { name: "Andrei Iosivas",        apy:  1_000_000 }, // 2023 rookie
  },
  cle: {
    QB:  { name: "Deshaun Watson",        apy: 46_000_000 }, // 2022 5yr/$230M
    RB:  { name: "Nick Chubb",            apy: 12_000_000 }, // 2023 extension
    WR:  { name: "Jerry Jeudy",           apy: 12_000_000 }, // 2023 extension
    WR2: { name: "Elijah Moore",          apy:  5_000_000 }, // 2023 trade
    WR3: { name: "Cedric Tillman",        apy:  1_000_000 }, // 2023 rookie
  },
  dal: {
    QB:  { name: "Dak Prescott",          apy: 60_000_000 }, // 2024 4yr/$240M
    WR:  { name: "CeeDee Lamb",           apy: 34_000_000 }, // 2024 4yr/$136M
    WR2: { name: "Brandin Cooks",         apy:  5_000_000 }, // 2023 trade
    WR3: { name: "Jalen Tolbert",         apy:  1_000_000 }, // 2022 rookie
    RG:  { name: "Zack Martin",           apy: 15_000_000 }, // Martin plays RG
    LG:  { name: "Tyler Smith",           apy:  4_000_000 }, // 2022 rookie OL
  },
  den: {
    QB:  { name: "Bo Nix",                apy:  8_200_000 }, // 2024 rookie
    WR:  { name: "Courtland Sutton",      apy: 13_000_000 }, // extension
    WR2: { name: "Marvin Mims Jr.",       apy:  1_000_000 }, // 2023 rookie
    WR3: { name: "Troy Franklin",         apy:  1_200_000 }, // 2024 rookie
  },
  det: {
    QB:  { name: "Jared Goff",            apy: 53_000_000 }, // 2024 4yr/$212M
    WR:  { name: "Amon-Ra St. Brown",     apy: 28_000_000 }, // 2023 4yr/$112M
    WR2: { name: "Jameson Williams",      apy:  4_400_000 }, // 2022 rookie
    WR3: { name: "Josh Reynolds",         apy:  3_000_000 }, // FA
    RT:  { name: "Penei Sewell",          apy: 22_000_000 }, // 2024 extension
    C:   { name: "Frank Ragnow",          apy: 14_000_000 }, // extension
  },
  gb: {
    QB:  { name: "Jordan Love",           apy: 55_000_000 }, // 2024 4yr/$220M
    RB:  { name: "Josh Jacobs",           apy: 12_000_000 }, // 2024 FA
    LT:  { name: "David Bakhtiari",       apy: 23_000_000 }, // extension
    LG:  { name: "Elgton Jenkins",        apy: 16_000_000 }, // 2023 extension
    WR:  { name: "Christian Watson",      apy:  4_000_000 }, // 2022 rookie + small ext
    WR2: { name: "Romeo Doubs",           apy:  2_500_000 }, // 2022 rookie
    WR3: { name: "Jayden Reed",           apy:  2_000_000 }, // 2023 rookie
  },
  hou: {
    QB:  { name: "C.J. Stroud",           apy:  9_600_000 }, // 2023 rookie
    WR:  { name: "Nico Collins",          apy: 28_000_000 }, // 2024 3yr/$84M
    WR2: { name: "Stefon Diggs",          apy: 23_000_000 }, // 2024 trade + extension
    WR3: { name: "Tank Dell",             apy:  1_200_000 }, // 2023 rookie
    LT:  { name: "Laremy Tunsil",         apy: 24_000_000 }, // extension
  },
  ind: {
    QB:  { name: "Anthony Richardson",    apy: 12_200_000 }, // 2023 rookie
    RB:  { name: "Jonathan Taylor",       apy: 21_000_000 }, // 2023 extension
    LG:  { name: "Quenton Nelson",        apy: 22_000_000 }, // extension
    WR:  { name: "Michael Pittman Jr.",   apy: 17_000_000 }, // 2023 extension
    WR2: { name: "Josh Downs",            apy:  2_000_000 }, // 2023 rookie
    WR3: { name: "Alec Pierce",           apy:  2_000_000 }, // 2022 rookie
  },
  jax: {
    QB:  { name: "Trevor Lawrence",       apy: 55_000_000 }, // 2023 5yr/$275M
    RB:  { name: "Travis Etienne Jr.",    apy: 17_000_000 }, // 2023 extension
    TE:  { name: "Evan Engram",           apy: 21_000_000 }, // 2023 extension
    WR:  { name: "Christian Kirk",        apy: 18_000_000 }, // 2022 4yr/$72M
    WR2: { name: "Gabe Davis",            apy: 10_000_000 }, // 2023 FA
    WR3: { name: "Parker Washington",     apy:  1_000_000 }, // 2023 rookie
  },
  kc: {
    QB:  { name: "Patrick Mahomes",       apy: 45_000_000 }, // 2020 10yr/$450M
    LG:  { name: "Joe Thuney",            apy: 16_000_000 }, // extension
    C:   { name: "Creed Humphrey",        apy: 17_000_000 }, // 2024 extension
    RG:  { name: "Trey Smith",            apy: 20_000_000 }, // 2024 4yr/$80M
    RT:  { name: "Jawaan Taylor",         apy: 15_000_000 }, // 2023 4yr/$60M
    WR:  { name: "Rashee Rice",           apy:  3_000_000 }, // 2022 rookie
    WR2: { name: "Mecole Hardman Jr.",    apy:  4_000_000 }, // re-signed
    WR3: { name: "Xavier Worthy",         apy:  1_500_000 }, // 2024 rookie
  },
  lac: {
    QB:  { name: "Justin Herbert",        apy: 52_500_000 }, // 2023 5yr/$262.5M
    LT:  { name: "Rashawn Slater",        apy: 24_000_000 }, // 2024 extension
    WR:  { name: "Quentin Johnston",      apy:  2_200_000 }, // 2023 rookie
    WR2: { name: "Joshua Palmer",         apy:  4_000_000 }, // extension
    WR3: { name: "Ladd McConkey",         apy:  2_000_000 }, // 2024 rookie
  },
  lar: {
    QB:  { name: "Matthew Stafford",      apy: 40_000_000 }, // 2022 4yr/$160M
    WR:  { name: "Cooper Kupp",           apy: 20_000_000 }, // extension
    WR2: { name: "Puka Nacua",            apy:  2_000_000 }, // 2023 rookie
    WR3: { name: "Tutu Atwell",           apy:  2_000_000 }, // 2021 rookie
  },
  lv: {
    QB:  { name: "Gardner Minshew II",    apy:  4_000_000 }, // 2025 starter
    LT:  { name: "Kolton Miller",         apy: 17_000_000 }, // extension
    WR:  { name: "Jakobi Meyers",         apy:  8_000_000 }, // 2023 3yr/$33M
    WR2: { name: "Tre Tucker",            apy:  1_000_000 }, // 2023 rookie
    WR3: { name: "DJ Turner II",          apy:  1_000_000 },
  },
  mia: {
    QB:  { name: "Tua Tagovailoa",        apy: 53_100_000 }, // 2024 4yr/$212.4M
    LT:  { name: "Terron Armstead",       apy: 17_000_000 }, // extension
    WR:  { name: "Tyreek Hill",           apy: 30_000_000 }, // 2022 4yr/$120M
    WR2: { name: "Jaylen Waddle",         apy: 23_000_000 }, // 2023 extension
    WR3: { name: "Braxton Berrios",       apy:  3_000_000 }, // FA
  },
  min: {
    QB:  { name: "Sam Darnold",           apy: 35_000_000 }, // 2025 3yr/$105M
    LT:  { name: "Christian Darrisaw",    apy: 16_000_000 }, // 2024 extension
    RT:  { name: "Brian O'Neill",         apy: 14_000_000 }, // extension
    WR:  { name: "Justin Jefferson",      apy: 35_000_000 }, // 2023 4yr/$140M
    WR2: { name: "Jordan Addison",        apy:  2_000_000 }, // 2023 rookie
    WR3: { name: "K.J. Osborn",           apy:  4_000_000 }, // extension
  },
  ne: {
    QB:  { name: "Drake Maye",            apy:  8_200_000 }, // 2024 rookie
    WR:  { name: "Kendrick Bourne",       apy:  7_000_000 }, // extension
    WR2: { name: "JuJu Smith-Schuster",   apy:  4_000_000 }, // 2023 FA
    WR3: { name: "DeMario Douglas",       apy:  1_000_000 }, // UDFA
  },
  no: {
    QB:  { name: "Derek Carr",            apy: 37_500_000 }, // 2023 4yr/$150M
    RB:  { name: "Alvin Kamara",          apy: 15_000_000 }, // extension
    WR:  { name: "Chris Olave",           apy: 18_000_000 }, // 2024 extension
    WR2: { name: "Rashid Shaheed",        apy:  1_000_000 }, // 2022 UDFA
    WR3: { name: "A.T. Perry",            apy:  1_000_000 }, // 2023 rookie
  },
  nyg: {
    QB:  { name: "Russell Wilson",        apy: 21_000_000 }, // 2025 FA
    LT:  { name: "Andrew Thomas",         apy: 22_000_000 }, // 2023 extension
    WR:  { name: "Malik Nabers",          apy:  4_200_000 }, // 2024 rookie
    WR2: { name: "Wan'Dale Robinson",     apy:  1_000_000 }, // 2022 rookie
    WR3: { name: "Darius Slayton",        apy:  3_000_000 }, // re-signed
  },
  nyj: {
    QB:  { name: "Aaron Rodgers",         apy: 35_000_000 }, // restructured
    WR:  { name: "Davante Adams",         apy: 28_000_000 }, // 2025 FA
    WR2: { name: "Garrett Wilson",        apy: 24_000_000 }, // 2024 extension
    WR3: { name: "Allen Lazard",          apy:  5_000_000 }, // 2023 FA
  },
  phi: {
    QB:  { name: "Jalen Hurts",           apy: 51_000_000 }, // 2023 5yr/$255M
    RB:  { name: "Saquon Barkley",        apy: 12_600_000 }, // 2024 3yr/$37.75M
    LT:  { name: "Jordan Mailata",        apy: 18_000_000 }, // extension
    LG:  { name: "Landon Dickerson",      apy: 13_000_000 }, // extension
    RT:  { name: "Lane Johnson",          apy: 18_000_000 }, // extension
    WR:  { name: "A.J. Brown",            apy: 32_000_000 }, // 2023 extension
    WR2: { name: "DeVonta Smith",         apy: 25_000_000 }, // 2024 extension
    WR3: { name: "Jahan Dotson",          apy:  2_000_000 }, // 2022 rookie
  },
  pit: {
    QB:  { name: "Justin Fields",         apy: 26_000_000 }, // 2025 extension
    LG:  { name: "Isaac Seumalo",         apy: 14_000_000 }, // 2023 extension
    WR:  { name: "George Pickens",        apy: 24_000_000 }, // 2024 extension
    WR2: { name: "Mike Williams",         apy:  5_000_000 }, // 2024 FA
    WR3: { name: "Calvin Austin III",     apy:  1_000_000 }, // 2022 rookie
  },
  sea: {
    QB:  { name: "Geno Smith",            apy: 35_000_000 }, // 2024 extension
    WR:  { name: "DK Metcalf",            apy: 34_000_000 }, // 2023 extension
    WR2: { name: "Tyler Lockett",         apy: 17_000_000 }, // extension
    WR3: { name: "Jaxon Smith-Njigba",    apy:  2_000_000 }, // 2023 rookie
  },
  sf: {
    QB:  { name: "Brock Purdy",           apy: 60_000_000 }, // 2024 extension
    RB:  { name: "Christian McCaffrey",   apy: 19_000_000 }, // 2023 extension
    TE:  { name: "George Kittle",         apy: 15_000_000 }, // extension
    LT:  { name: "Trent Williams",        apy: 25_000_000 }, // extension
    WR:  { name: "Brandon Aiyuk",         apy: 30_000_000 }, // 2024 4yr/$120M
    WR2: { name: "Deebo Samuel",          apy: 25_000_000 }, // extension
    WR3: { name: "Jauan Jennings",        apy:  4_000_000 }, // extension
  },
  tb: {
    QB:  { name: "Baker Mayfield",        apy: 40_000_000 }, // 2023 extension
    RT:  { name: "Tristan Wirfs",         apy: 30_000_000 }, // 2023 extension
    WR:  { name: "Mike Evans",            apy: 27_000_000 }, // 2024 extension
    WR2: { name: "Chris Godwin",          apy: 18_000_000 }, // extension
    WR3: { name: "Trey Palmer",           apy:  1_000_000 }, // 2023 rookie
  },
  ten: {
    QB:  { name: "Will Levis",            apy:  6_000_000 }, // 2023 rookie
    WR:  { name: "Calvin Ridley",         apy: 16_000_000 }, // 2024 FA
    WR2: { name: "DeAndre Hopkins",       apy: 16_000_000 }, // 2024 FA
    WR3: { name: "Tyler Boyd",            apy:  4_000_000 }, // 2024 FA
  },
  was: {
    QB:  { name: "Jayden Daniels",        apy: 10_200_000 }, // 2024 rookie
    WR:  { name: "Terry McLaurin",        apy: 17_000_000 }, // 2023 extension
    WR2: { name: "Dyami Brown",           apy:  1_000_000 },
    WR3: { name: "Luke McCaffrey",        apy:  1_000_000 }, // 2024 rookie
  },
}

// ---- CSV parsing -----------------------------------------------------------

interface ContractRow {
  player: string
  position: string
  teamId: string
  apy: number
}

function parseCsv(text: string): ContractRow[] {
  const lines = text.split("\n")
  if (lines.length < 2) return []

  const header = (lines[0] ?? "").split(",")
  const col = (name: string) => header.indexOf(name)
  const iPlayer   = col("player")
  const iPosition = col("position")
  const iTeam     = col("team")
  const iActive   = col("is_active")
  const iApy      = col("apy")

  const rows: ContractRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line?.trim()) continue
    const cells = line.split(",")

    if (cells[iActive] !== "TRUE") continue

    const player   = cells[iPlayer]?.trim()   ?? ""
    const position = cells[iPosition]?.trim() ?? ""
    const teamRaw  = cells[iTeam]?.trim()     ?? ""
    const apyRaw   = cells[iApy]?.trim()      ?? ""

    if (!player || !position || !teamRaw) continue
    const teamId = resolveTeamId(teamRaw)
    if (!teamId) continue

    const apy = Number(apyRaw)
    if (!Number.isFinite(apy) || apy <= 0) continue

    rows.push({ player, position, teamId, apy })
  }
  return rows
}

// ---- Fetch nflverse CSV ----------------------------------------------------

async function fetchAndParseCsv(): Promise<ContractRow[]> {
  const url =
    "https://github.com/nflverse/nflverse-data/releases/download/contracts/historical_contracts.csv.gz"
  process.stdout.write("  Downloading nflverse contracts... ")

  const res = await fetch(url, {
    headers: { "User-Agent": "Playerdle-data-builder/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const buf = await res.arrayBuffer()
  const csv = gunzipSync(Buffer.from(buf)).toString("utf-8")
  const rows = parseCsv(csv)
  console.log(`${rows.length} active contract rows`)
  return rows
}

// ---- Roster / jersey numbers -----------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,\s]+(jr\.?|sr\.?|ii|iii|iv)$/i, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchJerseyNumbers(): Promise<Map<string, Map<string, number>>> {
  const url =
    "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2025.csv"
  process.stdout.write("  Downloading nflverse roster (jersey numbers)... ")

  const res = await fetch(url, {
    headers: { "User-Agent": "Playerdle-data-builder/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  const lines = text.split("\n")
  const header = (lines[0] ?? "").split(",")
  const iTeam = header.indexOf("team")
  const iJersey = header.indexOf("jersey_number")
  const iName = header.indexOf("full_name")

  if (iTeam < 0 || iJersey < 0 || iName < 0) {
    throw new Error(`Roster CSV missing expected columns. Got: ${header.slice(0, 10).join(",")}`)
  }

  const byTeam = new Map<string, Map<string, number>>()
  let count = 0
  for (let i = 1; i < lines.length; i++) {
    const cells = (lines[i] ?? "").split(",")
    const teamRaw = cells[iTeam]?.trim() ?? ""
    const jerseyRaw = cells[iJersey]?.trim() ?? ""
    const nameRaw = cells[iName]?.trim() ?? ""
    if (!teamRaw || !jerseyRaw || !nameRaw) continue
    const teamId = TEAM_NAME_TO_ID[teamRaw] ?? null
    if (!teamId) continue
    const jersey = parseInt(jerseyRaw, 10)
    if (!Number.isFinite(jersey)) continue
    const key = normalizeName(nameRaw)
    if (!byTeam.has(teamId)) byTeam.set(teamId, new Map())
    const teamMap = byTeam.get(teamId)!
    if (!teamMap.has(key)) {
      teamMap.set(key, jersey)
      count++
    }
  }
  console.log(`${count} roster entries with jersey numbers`)
  return byTeam
}

// ---- Build team offenses ---------------------------------------------------

interface OffensePlayer {
  name: string
  salary: number
  number?: number
}

interface TeamOffense {
  QB: OffensePlayer
  RB: OffensePlayer
  TE: OffensePlayer
  WR: [OffensePlayer, OffensePlayer, OffensePlayer]
  OL: [OffensePlayer, OffensePlayer, OffensePlayer, OffensePlayer, OffensePlayer]
}

function buildTeamOffense(
  teamId: string,
  rows: ContractRow[],
  jerseyMap: Map<string, Map<string, number>>,
): TeamOffense | null {
  const ov = POST_2022_OVERRIDES[teamId] ?? {}
  const usedNames = new Set<string>()
  const teamJerseys = jerseyMap.get(teamId) ?? new Map<string, number>()

  function lookupJersey(name: string): number | undefined {
    return teamJerseys.get(normalizeName(name)) ?? undefined
  }

  function resolve(
    ovEntry: Override | undefined | null,
    pos: string,
    excludeNames: Set<string>,
  ): OffensePlayer | null {
    if (ovEntry) {
      usedNames.add(ovEntry.name)
      return { name: ovEntry.name, salary: ovEntry.apy, number: lookupJersey(ovEntry.name) }
    }
    // Find the highest-APY player at this position not already used
    const candidate = rows
      .filter(r => r.teamId === teamId && r.position === pos && !excludeNames.has(r.player))
      .sort((a, b) => b.apy - a.apy)[0]
    if (!candidate) return null
    usedNames.add(candidate.player)
    return { name: candidate.player, salary: candidate.apy, number: lookupJersey(candidate.player) }
  }

  const qb  = resolve(ov.QB,  "QB", usedNames)
  const rb  = resolve(ov.RB,  "RB", usedNames)
  const te  = resolve(ov.TE,  "TE", usedNames)
  const wr1 = resolve(ov.WR,  "WR", usedNames)
  const wr2 = resolve(ov.WR2, "WR", usedNames)
  const wr3 = resolve(ov.WR3, "WR", usedNames)
  const lt  = resolve(ov.LT,  "LT", usedNames)
  const lg  = resolve(ov.LG,  "LG", usedNames)
  const c   = resolve(ov.C,   "C",  usedNames)
  const rg  = resolve(ov.RG,  "RG", usedNames)
  const rt  = resolve(ov.RT,  "RT", usedNames)

  if (!qb || !rb || !te || !wr1 || !wr2 || !wr3 || !lt || !lg || !c || !rg || !rt) {
    const slots = { qb, rb, te, wr1, wr2, wr3, lt, lg, c, rg, rt }
    const nullSlots = Object.entries(slots).filter(([, v]) => !v).map(([k]) => k)
    console.warn(`    missing: ${nullSlots.join(", ")}`)
    return null
  }

  return {
    QB: qb,
    RB: rb,
    TE: te,
    WR: [wr1, wr2, wr3],
    OL: [lt, lg, c, rg, rt],
  }
}

// ---- Existing data ---------------------------------------------------------

interface ExistingTeam {
  id: string
  name: string
  abbr: string
  offense: TeamOffense
}

interface ExistingData {
  season: string
  description: string
  teams: ExistingTeam[]
}

function loadExisting(outputPath: string): ExistingData | null {
  if (!existsSync(outputPath)) return null
  try { return JSON.parse(readFileSync(outputPath, "utf-8")) as ExistingData }
  catch { return null }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  const { year, dryRun } = parseArgs()
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(
    __dirname, "..", "packages", "data", "src", "capcrunch", "nfl-capcrunch.json",
  )

  console.log(`NFL Cap Crunch Builder — ${year} season`)
  console.log("=".repeat(50))
  if (dryRun) console.log("DRY RUN — no file will be written\n")

  let rows: ContractRow[] = []
  try {
    rows = await fetchAndParseCsv()
  } catch (err) {
    console.warn(`  ⚠ Could not fetch nflverse CSV: ${err}`)
    console.warn("  Continuing with overrides + existing data only...")
  }

  let jerseyMap = new Map<string, Map<string, number>>()
  try {
    jerseyMap = await fetchJerseyNumbers()
  } catch (err) {
    console.warn(`  ⚠ Could not fetch roster data: ${err}`)
    console.warn("  Jersey numbers will be omitted.")
  }

  const existing = loadExisting(outputPath)
  const existingById = new Map(existing?.teams.map(t => [t.id, t]) ?? [])

  const allTeamIds = [
    "ari", "atl", "bal", "buf", "car", "chi", "cin", "cle",
    "dal", "den", "det", "gb",  "hou", "ind", "jax", "kc",
    "lac", "lar", "lv",  "mia", "min", "ne",  "no",  "nyg",
    "nyj", "phi", "pit", "sea", "sf",  "tb",  "ten", "was",
  ]

  const updatedTeams: ExistingTeam[] = []
  let built = 0
  let kept = 0

  for (const teamId of allTeamIds) {
    const offense = buildTeamOffense(teamId, rows, jerseyMap)
    const prev = existingById.get(teamId)

    if (!offense) {
      if (prev) {
        console.warn(`  ⚠ ${teamId.toUpperCase()} — keeping existing (build failed)`)
        updatedTeams.push(prev)
        kept++
      } else {
        console.warn(`  ⚠ ${teamId.toUpperCase()} — skipping (no data)`)
      }
      continue
    }

    updatedTeams.push({
      id: teamId,
      name: prev?.name ?? teamId.toUpperCase(),
      abbr: prev?.abbr ?? teamId.toUpperCase(),
      offense,
    })
    built++
  }

  console.log(`\nBuilt: ${built} teams${kept > 0 ? `, kept ${kept} from existing` : ""}`)

  if (dryRun) {
    console.log("\n--- DRY RUN (first 3 teams) ---")
    for (const t of updatedTeams.slice(0, 3)) console.log(JSON.stringify(t, null, 2))
    return
  }

  const output: ExistingData = {
    season: String(year),
    description:
      "NFL offensive starter salaries (AAV). Base: nflverse historical_contracts (2022). Post-2022 extensions patched via hardcoded overrides.",
    teams: updatedTeams,
  }

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8")
  console.log(`\n✓ Wrote ${updatedTeams.length} teams to ${outputPath}`)
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
