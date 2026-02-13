import type { SportConfig, SportVariant } from "./types"

export function getSportVariant(sport: SportConfig, variantId?: string): SportVariant | null {
  if (!variantId) return null
  return sport.variants?.find(variant => variant.id === variantId) ?? null
}

export function resolveSportConfig(sport: SportConfig, variantId?: string): SportConfig {
  const variant = getSportVariant(sport, variantId)
  if (!variant) {
    return {
      ...sport,
      activeVariantId: undefined,
      activeVariantLabel: undefined,
    }
  }

  return {
    ...sport,
    subtitle: variant.subtitle ?? sport.subtitle,
    players: variant.players,
    answerPool: variant.answerPool,
    columns: variant.columns,
    activeVariantId: variant.id,
    activeVariantLabel: variant.label,
  }
}
