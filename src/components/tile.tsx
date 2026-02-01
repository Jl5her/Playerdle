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
  let bgClass = ""
  let textClass = ""
  if (correct) {
    bgClass = "bg-success-500 dark:bg-success-400"
    textClass = "text-primary-50 dark:text-primary-900"
  } else if (close) {
    bgClass = "bg-warning-500 dark:bg-warning-400"
    textClass = "text-primary-50 dark:text-primary-900"
  } else {
    bgClass = "bg-error-500 dark:bg-error-400"
    textClass = "text-primary-50 dark:text-primary-900"
  }

  const containerStyle = {
    width: "clamp(2.5rem, 17vw, 5.5rem)",
    height: "clamp(2.3rem, 14vw, 4.5rem)",
    animationDelay: animate && delay ? `${delay}s` : undefined,
  }

  const valueStyle = {
    fontSize: "clamp(0.6rem, 2.8vw, 0.9rem)",
  }

  const containerClass = `flex items-center justify-center font-bold leading-tight p-1 rounded-md border-2 border-primary-300 dark:border-primary-700 transition-all duration-150 cursor-default ${bgClass} ${textClass} ${animate ? "animate-cell-flip" : ""}`

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
        {arrow && <span className="ml-1 text-sm">{arrow}</span>}
      </span>
    </div>
  )
}
