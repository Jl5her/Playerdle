import type { SportConfig, SportValue } from "./types"

function findDuplicateIds(items: Array<{ id: string }>): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id)
    } else {
      seen.add(item.id)
    }
  }

  return Array.from(duplicates)
}

function isNumericValue(value: SportValue): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) return false
    const parsed = Number(value)
    return Number.isFinite(parsed)
  }
  return false
}

export function validateSportConfig(config: SportConfig): string[] {
  const errors: string[] = []

  const duplicatePlayerIds = findDuplicateIds(config.players)
  if (duplicatePlayerIds.length > 0) {
    errors.push(`Duplicate player IDs: ${duplicatePlayerIds.join(", ")}`)
  }

  const duplicateAnswerIds = findDuplicateIds(config.answerPool)
  if (duplicateAnswerIds.length > 0) {
    errors.push(`Duplicate answer pool IDs: ${duplicateAnswerIds.join(", ")}`)
  }

  const playerIds = new Set(config.players.map(player => player.id))
  const missingFromPlayers = config.answerPool
    .map(player => player.id)
    .filter(id => !playerIds.has(id))

  if (missingFromPlayers.length > 0) {
    errors.push(`Answer pool IDs missing from players list: ${missingFromPlayers.join(", ")}`)
  }

  const duplicateColumnIds = findDuplicateIds(config.columns)
  if (duplicateColumnIds.length > 0) {
    errors.push(`Duplicate column IDs: ${duplicateColumnIds.join(", ")}`)
  }

  for (const column of config.columns) {
    if (!column.id || !column.key || !column.label) {
      errors.push(`Column is missing required fields (id/label/key): ${JSON.stringify(column)}`)
    } else {
      if (column.topKey && !column.example.topValue) {
        errors.push(`Column '${column.id}' defines topKey but example.topValue is missing`)
      }

      if (!column.topKey && column.example.topValue) {
        errors.push(`Column '${column.id}' example.topValue provided without topKey`)
      }

      if (column.evaluator.type !== "comparison" && column.example.arrow) {
        errors.push(`Column '${column.id}' example.arrow is only valid for comparison columns`)
      }

      for (const player of config.players) {
        const hasColumnKey = Object.prototype.hasOwnProperty.call(player, column.key)
        if (!hasColumnKey) {
          errors.push(`Column '${column.id}' key '${column.key}' missing on player '${player.id}'`)
        } else {
          if (column.topKey && !Object.prototype.hasOwnProperty.call(player, column.topKey)) {
            errors.push(
              `Column '${column.id}' topKey '${column.topKey}' missing on player '${player.id}'`,
            )
          }

          if (column.evaluator.type === "comparison" && !isNumericValue(player[column.key])) {
            errors.push(
              `Column '${column.id}' uses comparison but player '${player.id}' value is not numeric`,
            )
          }
        }
      }
    }

    if (
      column.evaluator.type === "comparison" &&
      column.evaluator.closeWithin !== undefined &&
      column.evaluator.closeWithin < 0
    ) {
      errors.push(`Column '${column.id}' closeWithin must be >= 0`)
    }
  }

  return errors
}

export function validateAllSportConfigs(configs: SportConfig[]): string[] {
  return configs.flatMap(config =>
    validateSportConfig(config).map(error => `[${config.id}] ${error}`),
  )
}
