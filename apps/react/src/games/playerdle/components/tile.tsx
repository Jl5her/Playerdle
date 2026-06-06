import type { ReactNode } from "react"
import { GuessTile } from "@/shared/components"

interface Cell {
  value: string
  renderedValue?: ReactNode
  correct: boolean
  close?: boolean
  arrow?: string
  tooltip?: ReactNode
}

interface Props {
  cell: Cell
  animate?: boolean
  delayIndex?: number
}

/**
 * Backwards-compatible Playerdle tile. Maps the legacy `correct`/`close` flags
 * onto the shared {@link GuessTile} so all games render identical cells.
 */
export default function Tile({ cell, animate, delayIndex = 0 }: Props) {
  const status = cell.correct ? "correct" : cell.close ? "close" : "incorrect"
  return (
    <GuessTile
      cell={{
        value: cell.value,
        renderedValue: cell.renderedValue,
        status,
        arrow: cell.arrow,
        tooltip: cell.tooltip,
      }}
      animate={animate}
      delayIndex={delayIndex}
    />
  )
}
