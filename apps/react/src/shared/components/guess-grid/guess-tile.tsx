import clsx from "clsx"
import { useEffect, useState } from "react"
import type { GuessCell } from "./types"

interface Props {
  cell: GuessCell
  animate?: boolean
  delayIndex?: number
}

/**
 * A single guess-grid cell: reveal animation, status color, value/arrow, and an
 * optional hover tooltip. Shared by Playerdle (and its variants) and the Rated
 * games so they all render identical cells.
 */
export default function GuessTile({ cell, animate, delayIndex = 0 }: Props) {
  const [revealed, setRevealed] = useState(!animate)
  const { value, renderedValue, arrow, status, tooltip } = cell

  useEffect(() => {
    if (!animate) return
    const revealAt = (delayIndex * 0.07 + 0.15) * 1000
    const timer = setTimeout(() => setRevealed(true), revealAt)
    return () => clearTimeout(timer)
  }, [animate, delayIndex])

  let bgClass: string
  let textClass: string
  if (!revealed) {
    bgClass = "bg-primary-200 dark:bg-primary-700"
    textClass = "text-primary-200 dark:text-primary-700"
  } else if (status === "correct") {
    bgClass = "bg-success-500 dark:bg-success-600"
    textClass = "text-primary-50"
  } else if (status === "close") {
    bgClass = "bg-warning-500 dark:bg-warning-600"
    textClass = "text-primary-50"
  } else {
    bgClass = "bg-error-500 dark:bg-error-600"
    textClass = "text-primary-50"
  }

  const delayClass = `tile-delay-${Math.min(delayIndex, 9)}`
  const containerClass = clsx(
    "flex items-center justify-center font-bold leading-tight p-1 rounded-md transition-colors duration-150 cursor-default",
    bgClass,
    textClass,
    animate && "animate-cell-flip",
    animate && delayClass,
  )

  const showTooltip = revealed && !!tooltip

  return (
    <div className={clsx("group grid-cell-size relative", containerClass)}>
      {renderedValue !== undefined ? (
        <div className="relative z-10 grid-cell-text text-center leading-tight">
          {revealed ? renderedValue : null}
          {revealed && arrow && <span className="ml-1 grid-cell-text">{arrow}</span>}
        </div>
      ) : (
        <span className="relative z-10 grid-cell-text text-center wrap-break-words">
          {revealed ? value : ""}
          {revealed && arrow && <span className="ml-1 grid-cell-text">{arrow}</span>}
        </span>
      )}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus-within:block z-50 pointer-events-none whitespace-normal w-max max-w-56 rounded-md bg-primary-50 dark:bg-primary-50 text-primary-900 dark:text-primary-900 border border-primary-300 dark:border-primary-400 text-xs font-normal leading-snug px-2 py-1.5 shadow-lg text-center"
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}
