#!/usr/bin/env tsx
/**
 * Builds NBA Cap Crunch data and writes to
 * packages/data/src/capcrunch/nba-capcrunch.json
 *
 * Salary data: hardcoded 2025-26 annual salary figures for all 30 teams.
 *   Update TEAM_DATA each offseason with new contracts / trades.
 *
 * Jersey numbers: fetched from the ESPN public roster API — no auth required.
 *   https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/roster
 *
 * Usage:
 *   pnpm scrape:nba:capcrunch
 *   pnpm scrape:nba:capcrunch -- --year=2026
 *   pnpm scrape:nba:capcrunch -- --dry-run
 */

import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ---- Config ----------------------------------------------------------------

function parseArgs(): { year: number; dryRun: boolean } {
  const yearArg = process.argv.find(a => a.startsWith("--year="))
  const year = yearArg ? Number(yearArg.split("=")[1]) : new Date().getFullYear()
  const dryRun = process.argv.includes("--dry-run")
  return { year, dryRun }
}

// ESPN team IDs used by the public roster API
const ESPN_TEAM_ID: Record<string, number> = {
  atl: 1,
  bos: 2,
  bkn: 17,
  cha: 30,
  chi: 4,
  cle: 5,
  dal: 6,
  den: 7,
  det: 8,
  gsw: 9,
  hou: 10,
  ind: 11,
  lac: 12,
  lal: 13,
  mem: 29,
  mia: 14,
  mil: 15,
  min: 16,
  nop: 3,
  nyk: 18,
  okc: 25,
  orl: 19,
  phi: 20,
  phx: 21,
  por: 22,
  sac: 23,
  sas: 24,
  tor: 28,
  uta: 26,
  was: 27,
}

// ---- Salary data -----------------------------------------------------------
// Update each offseason. Salary = annual value of current contract.

interface PlayerDef {
  name: string
  salary: number
}

interface Lineup {
  PG: PlayerDef
  SG: PlayerDef
  SF: PlayerDef
  PF: PlayerDef
  C: PlayerDef
}

interface TeamDef {
  name: string
  abbr: string
  lineup: Lineup
}

// 2025-26 starting five + approximate annual salaries for all 30 teams.
// Reflects known contracts and major transactions through early 2026.
const TEAM_DATA: Record<string, TeamDef> = {
  atl: {
    name: "Atlanta Hawks",
    abbr: "ATL",
    lineup: {
      PG: { name: "Trae Young", salary: 44_800_000 },
      SG: { name: "Dyson Daniels", salary: 7_200_000 },
      SF: { name: "De'Andre Hunter", salary: 22_000_000 },
      PF: { name: "Jalen Johnson", salary: 25_000_000 },
      C: { name: "Clint Capela", salary: 14_000_000 },
    },
  },
  bos: {
    name: "Boston Celtics",
    abbr: "BOS",
    lineup: {
      PG: { name: "Jrue Holiday", salary: 37_700_000 },
      SG: { name: "Derrick White", salary: 28_100_000 },
      SF: { name: "Jaylen Brown", salary: 53_100_000 },
      PF: { name: "Jayson Tatum", salary: 54_100_000 },
      C: { name: "Kristaps Porzingis", salary: 31_600_000 },
    },
  },
  bkn: {
    name: "Brooklyn Nets",
    abbr: "BKN",
    lineup: {
      PG: { name: "Dennis Schröder", salary: 13_000_000 },
      SG: { name: "Cam Thomas", salary: 14_000_000 },
      SF: { name: "Dorian Finney-Smith", salary: 15_000_000 },
      PF: { name: "Day'Ron Sharpe", salary: 5_000_000 },
      C: { name: "Nic Claxton", salary: 19_700_000 },
    },
  },
  cha: {
    name: "Charlotte Hornets",
    abbr: "CHA",
    lineup: {
      PG: { name: "LaMelo Ball", salary: 32_500_000 },
      SG: { name: "Miles Bridges", salary: 21_000_000 },
      SF: { name: "Brandon Miller", salary: 9_200_000 },
      PF: { name: "Grant Williams", salary: 14_000_000 },
      C: { name: "Mark Williams", salary: 9_000_000 },
    },
  },
  chi: {
    name: "Chicago Bulls",
    abbr: "CHI",
    lineup: {
      PG: { name: "Ayo Dosunmu", salary: 10_000_000 },
      SG: { name: "Zach LaVine", salary: 44_200_000 },
      SF: { name: "Coby White", salary: 24_000_000 },
      PF: { name: "Patrick Williams", salary: 16_000_000 },
      C: { name: "Nikola Vucevic", salary: 19_500_000 },
    },
  },
  cle: {
    name: "Cleveland Cavaliers",
    abbr: "CLE",
    lineup: {
      PG: { name: "Darius Garland", salary: 43_000_000 },
      SG: { name: "Donovan Mitchell", salary: 35_000_000 },
      SF: { name: "Isaac Okoro", salary: 14_000_000 },
      PF: { name: "Evan Mobley", salary: 22_600_000 },
      C: { name: "Jarrett Allen", salary: 19_800_000 },
    },
  },
  dal: {
    name: "Dallas Mavericks",
    abbr: "DAL",
    lineup: {
      PG: { name: "Kyrie Irving", salary: 43_000_000 },
      SG: { name: "Klay Thompson", salary: 15_900_000 },
      SF: { name: "Cooper Flagg", salary: 13_800_000 },
      PF: { name: "Anthony Davis", salary: 54_100_000 },
      C: { name: "Dereck Lively II", salary: 4_800_000 },
    },
  },
  den: {
    name: "Denver Nuggets",
    abbr: "DEN",
    lineup: {
      PG: { name: "Jamal Murray", salary: 46_400_000 },
      SG: { name: "Christian Braun", salary: 4_000_000 },
      SF: { name: "Michael Porter Jr.", salary: 33_000_000 },
      PF: { name: "Aaron Gordon", salary: 22_800_000 },
      C: { name: "Nikola Jokić", salary: 55_200_000 },
    },
  },
  det: {
    name: "Detroit Pistons",
    abbr: "DET",
    lineup: {
      PG: { name: "Cade Cunningham", salary: 32_600_000 },
      SG: { name: "Jaden Ivey", salary: 9_500_000 },
      SF: { name: "Ausar Thompson", salary: 7_700_000 },
      PF: { name: "Isaiah Stewart", salary: 12_000_000 },
      C: { name: "Jalen Duren", salary: 11_000_000 },
    },
  },
  gsw: {
    name: "Golden State Warriors",
    abbr: "GSW",
    lineup: {
      PG: { name: "Stephen Curry", salary: 59_600_000 },
      SG: { name: "Brandin Podziemski", salary: 3_800_000 },
      SF: { name: "Jimmy Butler", salary: 54_100_000 },
      PF: { name: "Draymond Green", salary: 25_300_000 },
      C: { name: "Jonathan Kuminga", salary: 29_000_000 },
    },
  },
  hou: {
    name: "Houston Rockets",
    abbr: "HOU",
    lineup: {
      PG: { name: "Fred VanVleet", salary: 42_300_000 },
      SG: { name: "Jalen Green", salary: 40_000_000 },
      SF: { name: "Dillon Brooks", salary: 19_200_000 },
      PF: { name: "Jabari Smith Jr.", salary: 9_000_000 },
      C: { name: "Alperen Şengün", salary: 28_900_000 },
    },
  },
  ind: {
    name: "Indiana Pacers",
    abbr: "IND",
    lineup: {
      PG: { name: "Tyrese Haliburton", salary: 41_500_000 },
      SG: { name: "Andrew Nembhard", salary: 20_000_000 },
      SF: { name: "Aaron Nesmith", salary: 18_000_000 },
      PF: { name: "Pascal Siakam", salary: 37_900_000 },
      C: { name: "Myles Turner", salary: 24_200_000 },
    },
  },
  lac: {
    name: "Los Angeles Clippers",
    abbr: "LAC",
    lineup: {
      PG: { name: "James Harden", salary: 35_600_000 },
      SG: { name: "Norman Powell", salary: 27_000_000 },
      SF: { name: "Kawhi Leonard", salary: 52_500_000 },
      PF: { name: "Nicolas Batum", salary: 10_000_000 },
      C: { name: "Ivica Zubac", salary: 17_100_000 },
    },
  },
  lal: {
    name: "Los Angeles Lakers",
    abbr: "LAL",
    lineup: {
      PG: { name: "Luka Dončić", salary: 43_000_000 },
      SG: { name: "Austin Reaves", salary: 13_900_000 },
      SF: { name: "LeBron James", salary: 52_600_000 },
      PF: { name: "Rui Hachimura", salary: 18_300_000 },
      C: { name: "Deandre Ayton", salary: 8_100_000 },
    },
  },
  mem: {
    name: "Memphis Grizzlies",
    abbr: "MEM",
    lineup: {
      PG: { name: "Ja Morant", salary: 43_700_000 },
      SG: { name: "Desmond Bane", salary: 26_000_000 },
      SF: { name: "Jaylen Wells", salary: 5_000_000 },
      PF: { name: "Jaren Jackson Jr.", salary: 35_000_000 },
      C: { name: "Zach Edey", salary: 5_500_000 },
    },
  },
  mia: {
    name: "Miami Heat",
    abbr: "MIA",
    lineup: {
      PG: { name: "Terry Rozier", salary: 26_600_000 },
      SG: { name: "Tyler Herro", salary: 34_400_000 },
      SF: { name: "Nikola Jović", salary: 11_000_000 },
      PF: { name: "Haywood Highsmith", salary: 8_000_000 },
      C: { name: "Bam Adebayo", salary: 34_700_000 },
    },
  },
  mil: {
    name: "Milwaukee Bucks",
    abbr: "MIL",
    lineup: {
      PG: { name: "Damian Lillard", salary: 48_800_000 },
      SG: { name: "Gary Trent Jr.", salary: 3_600_000 },
      SF: { name: "Giannis Antetokounmpo", salary: 54_100_000 },
      PF: { name: "Bobby Portis", salary: 13_400_000 },
      C: { name: "Brook Lopez", salary: 23_500_000 },
    },
  },
  min: {
    name: "Minnesota Timberwolves",
    abbr: "MIN",
    lineup: {
      PG: { name: "Mike Conley", salary: 21_000_000 },
      SG: { name: "Anthony Edwards", salary: 35_000_000 },
      SF: { name: "Jaden McDaniels", salary: 19_000_000 },
      PF: { name: "Julius Randle", salary: 30_700_000 },
      C: { name: "Rudy Gobert", salary: 41_000_000 },
    },
  },
  nop: {
    name: "New Orleans Pelicans",
    abbr: "NOP",
    lineup: {
      PG: { name: "CJ McCollum", salary: 30_000_000 },
      SG: { name: "Trey Murphy III", salary: 12_000_000 },
      SF: { name: "Brandon Ingram", salary: 38_600_000 },
      PF: { name: "Zion Williamson", salary: 35_700_000 },
      C: { name: "Jonas Valanciunas", salary: 15_000_000 },
    },
  },
  nyk: {
    name: "New York Knicks",
    abbr: "NYK",
    lineup: {
      PG: { name: "Jalen Brunson", salary: 34_900_000 },
      SG: { name: "Josh Hart", salary: 19_800_000 },
      SF: { name: "Mikal Bridges", salary: 24_900_000 },
      PF: { name: "OG Anunoby", salary: 39_600_000 },
      C: { name: "Karl-Anthony Towns", salary: 53_100_000 },
    },
  },
  okc: {
    name: "Oklahoma City Thunder",
    abbr: "OKC",
    lineup: {
      PG: { name: "Shai Gilgeous-Alexander", salary: 38_300_000 },
      SG: { name: "Luguentz Dort", salary: 17_700_000 },
      SF: { name: "Jalen Williams", salary: 6_600_000 },
      PF: { name: "Chet Holmgren", salary: 11_400_000 },
      C: { name: "Isaiah Hartenstein", salary: 28_500_000 },
    },
  },
  orl: {
    name: "Orlando Magic",
    abbr: "ORL",
    lineup: {
      PG: { name: "Cole Anthony", salary: 17_000_000 },
      SG: { name: "Kentavious Caldwell-Pope", salary: 22_500_000 },
      SF: { name: "Franz Wagner", salary: 29_500_000 },
      PF: { name: "Paolo Banchero", salary: 38_000_000 },
      C: { name: "Wendell Carter Jr.", salary: 17_000_000 },
    },
  },
  phi: {
    name: "Philadelphia 76ers",
    abbr: "PHI",
    lineup: {
      PG: { name: "Tyrese Maxey", salary: 35_000_000 },
      SG: { name: "Paul George", salary: 51_400_000 },
      SF: { name: "Kelly Oubre Jr.", salary: 13_000_000 },
      PF: { name: "Andre Drummond", salary: 15_000_000 },
      C: { name: "Joel Embiid", salary: 47_600_000 },
    },
  },
  phx: {
    name: "Phoenix Suns",
    abbr: "PHX",
    lineup: {
      PG: { name: "Bradley Beal", salary: 46_700_000 },
      SG: { name: "Devin Booker", salary: 35_300_000 },
      SF: { name: "Kevin Durant", salary: 51_200_000 },
      PF: { name: "Grayson Allen", salary: 20_000_000 },
      C: { name: "Jusuf Nurkić", salary: 17_000_000 },
    },
  },
  por: {
    name: "Portland Trail Blazers",
    abbr: "POR",
    lineup: {
      PG: { name: "Anfernee Simons", salary: 28_800_000 },
      SG: { name: "Jerami Grant", salary: 25_700_000 },
      SF: { name: "Shaedon Sharpe", salary: 6_000_000 },
      PF: { name: "Jabari Walker", salary: 3_000_000 },
      C: { name: "Robert Williams III", salary: 12_000_000 },
    },
  },
  sac: {
    name: "Sacramento Kings",
    abbr: "SAC",
    lineup: {
      PG: { name: "Malik Monk", salary: 13_000_000 },
      SG: { name: "Kevin Huerter", salary: 16_000_000 },
      SF: { name: "Harrison Barnes", salary: 18_000_000 },
      PF: { name: "Keegan Murray", salary: 14_000_000 },
      C: { name: "Domantas Sabonis", salary: 37_500_000 },
    },
  },
  sas: {
    name: "San Antonio Spurs",
    abbr: "SAS",
    lineup: {
      PG: { name: "De'Aaron Fox", salary: 35_000_000 },
      SG: { name: "Devin Vassell", salary: 21_600_000 },
      SF: { name: "Keldon Johnson", salary: 13_000_000 },
      PF: { name: "Jeremy Sochan", salary: 10_500_000 },
      C: { name: "Victor Wembanyama", salary: 13_800_000 },
    },
  },
  tor: {
    name: "Toronto Raptors",
    abbr: "TOR",
    lineup: {
      PG: { name: "Immanuel Quickley", salary: 33_200_000 },
      SG: { name: "RJ Barrett", salary: 25_800_000 },
      SF: { name: "Scottie Barnes", salary: 39_200_000 },
      PF: { name: "Gradey Dick", salary: 5_000_000 },
      C: { name: "Jakob Poeltl", salary: 22_000_000 },
    },
  },
  uta: {
    name: "Utah Jazz",
    abbr: "UTA",
    lineup: {
      PG: { name: "Collin Sexton", salary: 18_500_000 },
      SG: { name: "Jordan Clarkson", salary: 14_000_000 },
      SF: { name: "Lauri Markkanen", salary: 34_000_000 },
      PF: { name: "John Collins", salary: 26_600_000 },
      C: { name: "Walker Kessler", salary: 5_000_000 },
    },
  },
  was: {
    name: "Washington Wizards",
    abbr: "WAS",
    lineup: {
      PG: { name: "Jordan Poole", salary: 28_700_000 },
      SG: { name: "Corey Kispert", salary: 14_000_000 },
      SF: { name: "Bilal Coulibaly", salary: 6_000_000 },
      PF: { name: "Deni Avdija", salary: 22_000_000 },
      C: { name: "Alex Sarr", salary: 10_400_000 },
    },
  },
}

// ---- Jersey numbers via ESPN -----------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (e.g. č → c, ğ → g)
    .replace(/[,\s]+(jr\.?|sr\.?|ii|iii|iv)$/i, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchJerseyNumbers(): Promise<Map<string, number>> {
  const jerseyMap = new Map<string, number>()
  const teamIds = Object.keys(TEAM_DATA)
  process.stdout.write(`  Fetching jersey numbers from ESPN (${teamIds.length} teams)...\n`)

  let fetched = 0
  for (const teamId of teamIds) {
    const espnId = ESPN_TEAM_ID[teamId]
    if (!espnId) continue
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnId}/roster`
      const res = await fetch(url, {
        headers: { "User-Agent": "Playerdle-data-builder/1.0" },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) {
        console.warn(`    ⚠ ${teamId.toUpperCase()} ESPN fetch failed: HTTP ${res.status}`)
        continue
      }
      const json = (await res.json()) as {
        athletes?: Array<{ displayName?: string; jersey?: string }>
      }
      for (const athlete of json.athletes ?? []) {
        const name = athlete.displayName?.trim() ?? ""
        const jersey = parseInt(athlete.jersey ?? "", 10)
        if (name && Number.isFinite(jersey)) {
          jerseyMap.set(normalizeName(name), jersey)
        }
      }
      fetched++
    } catch (err) {
      console.warn(`    ⚠ ${teamId.toUpperCase()} ESPN fetch error: ${err}`)
    }
  }

  console.log(
    `  Fetched rosters for ${fetched}/${teamIds.length} teams — ${jerseyMap.size} players with jersey numbers`,
  )
  return jerseyMap
}

// ---- Build output ----------------------------------------------------------

interface OutputPlayer {
  name: string
  salary: number
  number?: number
}

interface OutputLineup {
  PG: OutputPlayer
  SG: OutputPlayer
  SF: OutputPlayer
  PF: OutputPlayer
  C: OutputPlayer
}

interface OutputTeam {
  id: string
  name: string
  abbr: string
  lineup: OutputLineup
}

function buildTeam(id: string, def: TeamDef, jerseyMap: Map<string, number>): OutputTeam {
  function player(p: PlayerDef): OutputPlayer {
    const number = jerseyMap.get(normalizeName(p.name))
    return number !== undefined
      ? { name: p.name, salary: p.salary, number }
      : { name: p.name, salary: p.salary }
  }
  return {
    id,
    name: def.name,
    abbr: def.abbr,
    lineup: {
      PG: player(def.lineup.PG),
      SG: player(def.lineup.SG),
      SF: player(def.lineup.SF),
      PF: player(def.lineup.PF),
      C: player(def.lineup.C),
    },
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  const { year, dryRun } = parseArgs()
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const outputPath = resolve(
    __dirname,
    "..",
    "packages",
    "data",
    "src",
    "capcrunch",
    "nba-capcrunch.json",
  )

  console.log(`NBA Cap Crunch Builder — ${year} season`)
  console.log("=".repeat(50))
  if (dryRun) console.log("DRY RUN — no file will be written\n")

  let jerseyMap = new Map<string, number>()
  try {
    jerseyMap = await fetchJerseyNumbers()
  } catch (err) {
    console.warn(`  ⚠ Could not fetch ESPN rosters: ${err}`)
    console.warn("  Jersey numbers will be omitted.")
  }

  const teams: OutputTeam[] = Object.entries(TEAM_DATA)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, def]) => buildTeam(id, def, jerseyMap))

  const withNumbers = teams.flatMap(t =>
    [t.lineup.PG, t.lineup.SG, t.lineup.SF, t.lineup.PF, t.lineup.C].filter(
      p => p.number !== undefined,
    ),
  ).length
  console.log(`\nBuilt ${teams.length} teams — ${withNumbers} players with jersey numbers`)

  if (dryRun) {
    console.log("\n--- DRY RUN (first 3 teams) ---")
    for (const t of teams.slice(0, 3)) console.log(JSON.stringify(t, null, 2))
    return
  }

  const output = {
    season: String(year),
    description:
      "NBA starting-five salaries (annual value). Salary data: hardcoded — update each offseason. Jersey numbers: ESPN public roster API.",
    teams,
  }

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8")
  console.log(`\n✓ Wrote ${teams.length} teams to ${outputPath}`)
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
