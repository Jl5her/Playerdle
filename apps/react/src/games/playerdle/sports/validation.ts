import type { Player, SportColumn, SportConfig, SportValue } from "./types"

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

function validateColumnSet(columns: SportColumn[], players: Player[], prefix: string): string[] {
  const errors: string[] = []
  const duplicateColumnIds = findDuplicateIds(columns)
  if (duplicateColumnIds.length > 0) {
    errors.push(`${prefix}Duplicate column IDs: ${duplicateColumnIds.join(", ")}`)
  }

  for (const column of columns) {
    if (!column.id || !column.key || !column.label) {
      errors.push(
        `${prefix}Column is missing required fields (id/label/key): ${JSON.stringify(column)}`,
      )
    } else {
      if (column.evaluator.type !== "comparison" && column.example.arrow) {
        errors.push(
          `${prefix}Column '${column.id}' example.arrow is only valid for comparison columns`,
        )
      }

      for (const player of players) {
        const hasColumnKey = Object.prototype.hasOwnProperty.call(player, column.key)
        if (!hasColumnKey) {
          errors.push(
            `${prefix}Column '${column.id}' key '${column.key}' missing on player '${player.id}'`,
          )
        } else {
          if (column.evaluator.type === "comparison" && !isNumericValue(player[column.key])) {
            errors.push(
              `${prefix}Column '${column.id}' uses comparison but player '${player.id}' value is not numeric`,
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
      errors.push(`${prefix}Column '${column.id}' closeWithin must be >= 0`)
    }
  }

  return errors
}

function validatePlayerAndAnswerPool(
  players: Player[],
  answerPool: Player[],
  prefix: string,
): string[] {
  const errors: string[] = []

  const duplicatePlayerIds = findDuplicateIds(players)
  if (duplicatePlayerIds.length > 0) {
    errors.push(`${prefix}Duplicate player IDs: ${duplicatePlayerIds.join(", ")}`)
  }

  const duplicateAnswerIds = findDuplicateIds(answerPool)
  if (duplicateAnswerIds.length > 0) {
    errors.push(`${prefix}Duplicate answer pool IDs: ${duplicateAnswerIds.join(", ")}`)
  }

  const playerIds = new Set(players.map(player => player.id))
  const missingFromPlayers = answerPool.map(player => player.id).filter(id => !playerIds.has(id))
  if (missingFromPlayers.length > 0) {
    errors.push(
      `${prefix}Answer pool IDs missing from players list: ${missingFromPlayers.join(", ")}`,
    )
  }

  return errors
}

export function validateSportConfig(config: SportConfig): string[] {
  const errors: string[] = []

  errors.push(...validatePlayerAndAnswerPool(config.players, config.answerPool, ""))
  errors.push(...validateColumnSet(config.columns, config.players, ""))

  for (const variant of config.variants ?? []) {
    const prefix = `Variant '${variant.id}': `
    errors.push(...validatePlayerAndAnswerPool(variant.players, variant.answerPool, prefix))
    errors.push(...validateColumnSet(variant.columns, variant.players, prefix))
  }

  return errors
}

export function validateAllSportConfigs(configs: SportConfig[]): string[] {
  return configs.flatMap(config =>
    validateSportConfig(config).map(error => `[${config.id}] ${error}`),
  )
}
