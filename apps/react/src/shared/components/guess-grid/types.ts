import type { ReactNode } from "react"

/** Outcome of a single cell, driving its color (green / yellow / red). */
export type GuessCellStatus = "correct" | "close" | "incorrect"

/** One cell of a guess row. Works for any content (numbers, text, custom nodes). */
export interface GuessCell {
  /** Raw string shown when no `renderedValue` is provided. */
  value: string
  /** Optional custom node rendered instead of `value` (e.g. multi-line labels). */
  renderedValue?: ReactNode
  status: GuessCellStatus
  /** Directional hint shown after the value, e.g. "↑" / "↓". */
  arrow?: string
  /** Optional hover/focus tooltip. */
  tooltip?: ReactNode
}

/** One filled guess row: an optional header label plus its cells. */
export interface GuessGridRow {
  /** Stable identity for the row (used for React keys). */
  id: string | number
  /** Row header rendered above the cells (player or team name). */
  label?: ReactNode
  cells: GuessCell[]
  /** When true, visually de-emphasises the row (e.g. spoiler-blur the answer). */
  muted?: boolean
}
