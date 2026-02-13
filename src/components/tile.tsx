import { useState, useEffect } from "react"

interface Cell {
  value: string
  correct: boolean
  close?: boolean
  arrow?: string
  topValue?: string
}

interface Props {
  cell: Cell
  animate?: boolean
  delayIndex?: number
}

export default function Tile({ cell, animate, delayIndex = 0 }: Props) {
  const [revealed, setRevealed] = useState(!animate)
  const { value, arrow, correct, close, topValue } = cell

  useEffect(() => {
    if (!animate) return
    const revealAt = (delayIndex * 0.15 + 0.3) * 1000
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
  const containerClass = `flex items-center justify-center font-bold leading-tight p-1 rounded-md border border-primary-200 dark:border-primary-600 transition-colors duration-150 cursor-default ${bgClass} ${textClass} ${animate ? `animate-cell-flip ${delayClass}` : ""}`

  return (
    <div className={`grid-cell-size ${containerClass}`}>
      {topValue ? (
        <div className="flex flex-col items-center justify-center relative z-10">
          <span className="grid-cell-top-text text-center leading-tight">
            {revealed ? topValue : ""}
          </span>
          <span className="grid-cell-text text-center leading-tight">{revealed ? value : ""}</span>
        </div>
      ) : (
        <span className="grid-cell-text text-center wrap-break-words relative z-10">
          {revealed ? value : ""}
          {revealed && arrow && <span className="ml-1 text-sm">{arrow}</span>}
        </span>
      )}
    </div>
  )
}
