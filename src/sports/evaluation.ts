import type { Player, SportColumn, SportValue } from "./types"

export type CellStatus = "correct" | "close" | "incorrect"

export interface EvaluatedCell {
  value: string
  status: CellStatus
  arrow?: string
}

function toDisplayValue(value: SportValue): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function toNumber(value: SportValue): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function evaluateColumn(guess: Player, answer: Player, column: SportColumn): EvaluatedCell {
  const guessValue = guess[column.key]
  const answerValue = answer[column.key]

  if (column.evaluator.type === "match") {
    return {
      value: toDisplayValue(guessValue),
      status: guessValue === answerValue ? "correct" : "incorrect",
    }
  }

  if (column.evaluator.type === "mismatch") {
    return {
      value: toDisplayValue(guessValue),
      status: guessValue !== answerValue ? "correct" : "incorrect",
    }
  }

  const guessNumber = toNumber(guessValue)
  const answerNumber = toNumber(answerValue)
  if (guessNumber === null || answerNumber === null) {
    return {
      value: toDisplayValue(guessValue),
      status: "incorrect",
    }
  }

  const diff = Math.abs(guessNumber - answerNumber)
  const isMatch = guessNumber === answerNumber
  const isClose =
    !isMatch && column.evaluator.closeWithin !== undefined && diff <= column.evaluator.closeWithin

  return {
    value: toDisplayValue(guessValue),
    status: isMatch ? "correct" : isClose ? "close" : "incorrect",
    arrow:
      column.evaluator.showDirection && !isMatch
        ? guessNumber < answerNumber
          ? "\u2191"
          : "\u2193"
        : undefined,
  }
}
