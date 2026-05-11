import type { ReactNode } from "react"
import { useEffect, useState } from "react"

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

export default function Tile({ cell, animate, delayIndex = 0 }: Props) {
  const [revealed, setRevealed] = useState(!animate)
  const { value, renderedValue, arrow, correct, close, tooltip } = cell

  useEffect(() => {
    if (!animate) return
    const revealAt = (delayIndex * 0.1 + 0.2) * 1000
    const timer = setTimeout(() => setRevealed(true), revealAt)
    return () => clearTimeout(timer)
  }, [animate, delayIndex])

  let bgClass: string
  let textClass: string
  if (!revealed) {
    bgClass = "bg-primary-200 dark:bg-primary-700"
    textClass = "text-primary-200 dark:text-primary-700"
  } else if (correct) {
    bgClass = "bg-success-500 dark:bg-success-600"
    textClass = "text-primary-50"
  } else if (close) {
    bgClass = "bg-warning-500 dark:bg-warning-600"
    textClass = "text-primary-50"
  } else {
    bgClass = "bg-error-500 dark:bg-error-600"
    textClass = "text-primary-50"
  }

  const delayClass = `tile-delay-${Math.min(delayIndex, 9)}`
  const containerClass = `flex items-center justify-center font-bold leading-tight p-1 rounded-md transition-colors duration-150 cursor-default ${bgClass} ${textClass} ${animate ? `animate-cell-flip ${delayClass}` : ""}`

  const showTooltip = revealed && !!tooltip

  return (
    <div className={`group grid-cell-size relative ${containerClass}`}>
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
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus-within:block z-50 pointer-events-none whitespace-normal w-max max-w-[14rem] rounded-md bg-primary-50 dark:bg-primary-50 text-primary-900 dark:text-primary-900 border border-primary-300 dark:border-primary-400 text-xs font-normal leading-snug px-2 py-1.5 shadow-lg text-center"
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}
