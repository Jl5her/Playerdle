import type { CSSProperties } from "react"

interface Cell {
  value: string
  correct: boolean
  close?: boolean
  arrow?: string
}

interface Props {
  cell: Cell
  animate?: boolean
  delay?: number
}

export default function Tile({ cell, animate, delay }: Props) {
  const { value, arrow, correct, close } = cell
  const bgClass = correct
    ? "bg-state-success-muted"
    : close
      ? "bg-state-warning"
      : "bg-state-error-muted"

  const containerStyle: CSSProperties = {
    width: "clamp(2.5rem, 17vw, 5.5rem)",
    height: "clamp(2.3rem, 14vw, 4.5rem)",
    animationDelay: animate && delay ? `${delay}s` : undefined,
  }

  const valueStyle: CSSProperties = {
    fontSize: "clamp(0.6rem, 2.8vw, 0.9rem)",
  }

  const containerClass = `flex items-center justify-center font-bold leading-tight p-1 rounded border-2 border-black border-opacity-8 text-tile-text transition-all duration-120 cursor-default ${bgClass} ${animate ? "cell-flip" : ""}`

  return (
    <div
      style={containerStyle}
      className={containerClass}
    >
      <span
        style={valueStyle}
        className="text-center wrap-break-words relative z-10"
      >
        {value}
        {arrow && <span className="ml-0.5 text-sm">{arrow}</span>}
      </span>
    </div>
  )
}
