/**
 * Converts a hex color to a generic English color name.
 * Names are intentionally non-team-specific (e.g. "Navy" not "Midnight Navy")
 * so they describe the color without hinting at a particular team.
 */
export function hexToColorName(hex: string): string {
  if (hex === "transparent") return ""

  const clean = hex.replace("#", "")
  if (clean.length !== 6) return ""

  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (l < 0.07) return "Black"
  if (l > 0.91) return "White"

  const s = max === min ? 0 : l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min)

  if (s < 0.12) {
    if (l < 0.38) return "Charcoal"
    if (l < 0.62) return "Gray"
    return "Silver"
  }

  // Hue calculation
  let h = 0
  if (max === r) {
    h = (g - b) / (max - min)
  } else if (max === g) {
    h = 2 + (b - r) / (max - min)
  } else {
    h = 4 + (r - g) / (max - min)
  }
  h = (h * 60 + 360) % 360

  // Red family (0–20° and 340–360°)
  if (h < 20 || h >= 340) {
    if (l < 0.22) return "Maroon"
    // Warm orange-reds (h 8–20°) with moderate saturation are burnt orange, not crimson
    if (h > 8 && h < 20 && s > 0.5 && l > 0.28) return "Orange"
    if (l < 0.42) return "Crimson"
    // Bright saturated orangereds (e.g. Broncos #FB4F14, Browns #FF3C00) — only h<20 side
    if (h < 20 && s > 0.85 && l > 0.44) return "Orange"
    return "Red"
  }

  // Orange / Brown / Gold / Cream range (20–65°)
  if (h < 65) {
    // Creams and ivories: high lightness across all three channels
    if (l > 0.78) return "Cream"

    // Distinguish gold from orange using R:G ratio.
    // Gold has R and G both high (warm amber). Orange has R >> G.
    const rgRatio = g > 0.01 ? r / g : 99
    const isGoldToned = rgRatio < 1.75 && b < 0.35

    if (isGoldToned) {
      if (l < 0.22) return "Brown" // too dark to read as gold — e.g. Browns #472a08
      if (l < 0.38) return "Old Gold"
      return "Gold"
    }

    // Darker non-gold colors in this range
    if (l < 0.22) return "Brown"
    if (l < 0.38 && s > 0.45) return "Rust"
    if (s > 0.55 && l > 0.44) return "Orange"
    if (l > 0.6) return "Tan"
    return "Tan"
  }

  // Green family (65–165°)
  if (h < 165) {
    if (l < 0.18) return "Forest Green"
    if (h < 90) return "Lime"
    return "Green"
  }

  // Teal / Cyan (165–200°)
  if (h < 200) return "Teal"

  // Blue family (200–248°)
  if (h < 248) {
    if (l < 0.22) return "Navy"
    if (l < 0.38) return "Dark Blue"
    if (s > 0.55) return "Light Blue"
    return "Blue"
  }

  // Purple / Violet (265–300°)
  if (h < 300) {
    if (l < 0.28) return "Dark Purple"
    return "Purple"
  }

  // Magenta / Wine (300–340°)
  if (l < 0.28) return "Dark Red"
  return "Magenta"
}
