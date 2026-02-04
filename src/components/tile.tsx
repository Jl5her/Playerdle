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
  delay?: number
}

export default function Tile({ cell, animate, delay }: Props) {
  const [revealed, setRevealed] = useState(!animate)
  const { value, arrow, correct, close, topValue } = cell

  useEffect(() => {
    if (!animate) return
    const revealAt = ((delay ?? 0) + 0.3) * 1000
    const timer = setTimeout(() => setRevealed(true), revealAt)
    return () => clearTimeout(timer)
  }, [animate, delay])

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

  const containerStyle = {
    width: "clamp(2.5rem, 16vw, 5rem)",
    height: "clamp(2.5rem, 16vw, 5rem)",
    animationDelay: animate && delay ? `${delay}s` : undefined,
  }

  const valueStyle = {
    fontSize: "clamp(0.6rem, 2.8vw, 0.9rem)",
  }

  const containerClass = `flex items-center justify-center font-bold leading-tight p-1 rounded-md border-2 border-primary-300 dark:border-primary-700 transition-colors duration-150 cursor-default ${bgClass} ${textClass} ${animate ? "animate-cell-flip" : ""}`

  return (
    <div
      style={containerStyle}
      className={containerClass}
    >
      {topValue ? (
        <div className="flex flex-col items-center justify-center relative z-10">
          <span style={{ fontSize: "clamp(0.5rem, 2.2vw, 0.7rem)" }} className="text-center leading-tight">
            {revealed ? topValue : ""}
          </span>
          <span style={valueStyle} className="text-center leading-tight">
            {revealed ? value : ""}
          </span>
        </div>
      ) : (
        <span
          style={valueStyle}
          className="text-center wrap-break-words relative z-10"
        >
          {revealed ? value : ""}
          {revealed && arrow && <span className="ml-1 text-sm">{arrow}</span>}
        </span>
      )}
    </div>
  )
}
