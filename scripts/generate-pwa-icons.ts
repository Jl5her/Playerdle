#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, "..", "apps", "react", "public")

interface Target {
  source: "icon.svg" | "icon-maskable.svg"
  size: number
  output: string
}

const TARGETS: Target[] = [
  { source: "icon.svg", size: 192, output: "icon-192.png" },
  { source: "icon.svg", size: 512, output: "icon-512.png" },
  { source: "icon.svg", size: 180, output: "apple-touch-icon.png" },
  { source: "icon-maskable.svg", size: 512, output: "icon-maskable-512.png" },
]

async function main() {
  for (const target of TARGETS) {
    const svg = readFileSync(resolve(publicDir, target.source))
    const png = await sharp(svg).resize(target.size, target.size).png().toBuffer()
    writeFileSync(resolve(publicDir, target.output), png)
    console.log(`  ${target.output} (${target.size}x${target.size})`)
  }

  // 32x32 favicon as PNG (most browsers accept .png for favicons via type)
  const favSvg = readFileSync(resolve(publicDir, "icon.svg"))
  const favPng = await sharp(favSvg).resize(32, 32).png().toBuffer()
  writeFileSync(resolve(publicDir, "favicon-32.png"), favPng)
  console.log(`  favicon-32.png (32x32)`)

  // 1200x630 Open Graph banner
  const ogSvg = readFileSync(resolve(publicDir, "og-image.svg"))
  const ogPng = await sharp(ogSvg).resize(1200, 630).png().toBuffer()
  writeFileSync(resolve(publicDir, "og-image.png"), ogPng)
  console.log(`  og-image.png (1200x630)`)
}

main().catch(err => {
  console.error("Icon generation failed:", err)
  process.exit(1)
})
