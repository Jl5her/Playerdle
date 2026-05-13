#!/usr/bin/env tsx

// Append-only pool manager for the journey daily puzzle.
//
// Run this manually after adding new players to packages/data/src/journeyman/players.ts.
// It never reorders or removes existing entries — only appends newly eligible
// player IDs — so no existing date → player mappings ever change.
//
// Usage:
//   pnpm run generate:journey-pool

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const DATA_ROOT = resolve(ROOT, "packages/data/src")

async function main() {
  const poolPath = resolve(DATA_ROOT, "journeyman/answer_pool.json")

  const { ELIGIBLE_JOURNEY_PLAYERS } = await import("../packages/data/src/journeyman/players.ts")
  const currentPool: string[] = JSON.parse(readFileSync(poolPath, "utf-8"))

  const inPool = new Set(currentPool)
  const toAppend = ELIGIBLE_JOURNEY_PLAYERS.filter(p => !inPool.has(p.id))

  if (toAppend.length === 0) {
    console.log("Answer pool is already up-to-date. No changes made.")
    return
  }

  const updated = [...currentPool, ...toAppend.map(p => p.id)]
  writeFileSync(poolPath, `${JSON.stringify(updated, null, 2)}\n`, "utf-8")

  console.log(`Appended ${toAppend.length} new player(s) to the answer pool:`)
  for (const p of toAppend) console.log(`  + ${p.id}  (${p.name})`)
  console.log(`\nPool size: ${currentPool.length} → ${updated.length}`)
  console.log(
    "\nNOTE: Appending changes the modulo for dates beyond the previous pool length.",
    "\nCommit the updated answer_pool.json to activate the new players.",
  )
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
