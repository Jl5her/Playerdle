import type { ReactNode } from "react"
import type { GuessCell, GuessCellStatus } from "./types"

interface CellOptions {
  arrow?: string
  tooltip?: ReactNode
  renderedValue?: ReactNode
}

/** Build a text cell (CONF, TEAM, POS, team name, …). */
export function textCell(
  value: string,
  status: GuessCellStatus,
  options: CellOptions = {},
): GuessCell {
  return { value, status, ...options }
}

/** Build a numeric cell (jersey #, OVR, stats, …). */
export function numberCell(
  value: number | string,
  status: GuessCellStatus,
  options: CellOptions = {},
): GuessCell {
  return { value: String(value), status, ...options }
}
