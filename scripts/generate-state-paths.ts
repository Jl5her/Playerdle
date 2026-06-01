import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const TARGET_IDS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]

interface Location {
  name: string
  id: string
  path: string
}

interface MapData {
  viewBox: string
  locations: Location[]
}

function parsePathBbox(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? []
  let i = 0
  let cmd = ""
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  function track() {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  function readNum(): number {
    return parseFloat(tokens[i++])
  }

  while (i < tokens.length) {
    const token = tokens[i]
    if (/^[a-zA-Z]$/.test(token)) {
      cmd = token
      i++
    }
    const lower = cmd.toLowerCase()
    const rel = cmd === lower
    switch (lower) {
      case "m": {
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        startX = x
        startY = y
        track()
        cmd = rel ? "l" : "L"
        break
      }
      case "l": {
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        track()
        break
      }
      case "h": {
        const dx = readNum()
        x = rel ? x + dx : dx
        track()
        break
      }
      case "v": {
        const dy = readNum()
        y = rel ? y + dy : dy
        track()
        break
      }
      case "c": {
        readNum()
        readNum()
        readNum()
        readNum()
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        track()
        break
      }
      case "s":
      case "q": {
        readNum()
        readNum()
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        track()
        break
      }
      case "t": {
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        track()
        break
      }
      case "a": {
        readNum()
        readNum()
        readNum()
        readNum()
        readNum()
        const dx = readNum()
        const dy = readNum()
        x = rel ? x + dx : dx
        y = rel ? y + dy : dy
        track()
        break
      }
      case "z": {
        x = startX
        y = startY
        track()
        break
      }
      default:
        i++
    }
  }

  return { minX, minY, maxX, maxY }
}

async function main() {
  const mod = await import("@svg-maps/usa")
  const data = mod.default as MapData
  const out: Record<string, { viewBox: string; d: string }> = {}

  for (const id of TARGET_IDS) {
    const loc = data.locations.find(l => l.id.toUpperCase() === id)
    if (!loc) {
      throw new Error(`Missing state ${id}`)
    }
    const { minX, minY, maxX, maxY } = parsePathBbox(loc.path)
    const pad = 1
    const w = maxX - minX + pad * 2
    const h = maxY - minY + pad * 2
    out[id] = {
      viewBox: `${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`,
      d: loc.path,
    }
  }

  const tsLines: string[] = []
  tsLines.push("export interface StatePath {")
  tsLines.push("  viewBox: string")
  tsLines.push("  d: string")
  tsLines.push("}")
  tsLines.push("")
  tsLines.push("export const STATE_PATHS: Record<string, StatePath> = {")
  for (const id of TARGET_IDS) {
    const entry = out[id]
    tsLines.push(`  ${id}: {`)
    tsLines.push(`    viewBox: "${entry.viewBox}",`)
    tsLines.push(`    d: ${JSON.stringify(entry.d)},`)
    tsLines.push("  },")
  }
  tsLines.push("}")
  tsLines.push("")

  const outPath = resolve(process.cwd(), "packages/data/src/statehue/state-paths.ts")
  writeFileSync(outPath, tsLines.join("\n"))
  console.log(`wrote ${outPath} (${Object.keys(out).length} states)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
