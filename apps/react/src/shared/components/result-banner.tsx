import clsx from "clsx"
import type { ReactNode } from "react"

interface Props {
  won: boolean
  answer: ReactNode
  guessCount: number
  lossMessage?: string
}

export default function ResultBanner({
  won,
  answer,
  guessCount,
  lossMessage = "Better luck tomorrow!",
}: Props) {
  const statusColor = won
    ? "text-success-500 dark:text-success-400"
    : "text-error-500 dark:text-error-400"

  return (
    <div
      className={clsx(
        "shrink-0 px-4 py-4 text-center border-y-2 mt-1",
        won
          ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
          : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60",
      )}
    >
      <div className={clsx("text-xs font-bold uppercase tracking-[0.2em]", statusColor)}>
        {won ? "Correct" : "Game Over"}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-primary-500 dark:text-primary-200 opacity-70 mt-2">
        The answer was
      </div>
      <div className="text-3xl font-black uppercase tracking-tight text-primary-900 dark:text-primary-50 mt-1">
        {answer}
      </div>
      <div className={clsx("text-sm font-medium uppercase mt-3", statusColor)}>
        {won
          ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
          : lossMessage}
      </div>
    </div>
  )
}
