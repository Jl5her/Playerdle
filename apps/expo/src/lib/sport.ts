export type SportValue = string | number | boolean | null | undefined

export interface Player {
  id: string
  name: string
  [key: string]: SportValue
}

export type ColumnEvaluator =
  | { type: "match" }
  | { type: "mismatch" }
  | { type: "comparison"; closeWithin?: number; showDirection?: boolean }

export interface SportColumn {
  id: string
  label: string
  key: string
  evaluator: ColumnEvaluator
}

export interface SportConfig {
  id: "nfl"
  displayName: string
  players: Player[]
  answerPool: Player[]
  columns: SportColumn[]
}

export type CellStatus = "correct" | "close" | "incorrect"

export interface EvaluatedCell {
  value: string
  status: CellStatus
  arrow?: "↑" | "↓"
}

function toDisplay(value: SportValue): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function toNum(value: SportValue): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

export function evaluateColumn(guess: Player, answer: Player, column: SportColumn): EvaluatedCell {
  const g = guess[column.key]
  const a = answer[column.key]

  if (column.evaluator.type === "match") {
    return { value: toDisplay(g), status: g === a ? "correct" : "incorrect" }
  }
  if (column.evaluator.type === "mismatch") {
    return { value: toDisplay(g), status: g !== a ? "correct" : "incorrect" }
  }

  const gn = toNum(g)
  const an = toNum(a)
  if (gn === null || an === null) {
    return { value: toDisplay(g), status: "incorrect" }
  }

  const isMatch = gn === an
  const isClose =
    !isMatch &&
    column.evaluator.closeWithin !== undefined &&
    Math.abs(gn - an) <= column.evaluator.closeWithin

  return {
    value: toDisplay(g),
    status: isMatch ? "correct" : isClose ? "close" : "incorrect",
    arrow: column.evaluator.showDirection && !isMatch ? (gn < an ? "↑" : "↓") : undefined,
  }
}
