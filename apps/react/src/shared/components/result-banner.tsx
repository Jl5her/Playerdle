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
  return (
    <div
      className={clsx(
        "shrink-0 px-4 py-4 text-center mt-1",
        won ? "bg-success-600 dark:bg-success-700" : "bg-error-600 dark:bg-error-700",
      )}
    >
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
        {won ? "Correct" : "Game Over"}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/60 mt-2">
        The answer was
      </div>
      <div className="text-3xl font-black uppercase tracking-tight text-white mt-1">
        {answer}
      </div>
      <div className="text-sm font-medium uppercase mt-3 text-white/80">
        {won
          ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
          : lossMessage}
      </div>
    </div>
  )
}
