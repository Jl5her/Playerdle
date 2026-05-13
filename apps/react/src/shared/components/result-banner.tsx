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
      className={`shrink-0 px-4 py-3 text-center border-y-2 mt-1 ${
        won
          ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
          : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60"
      }`}
    >
      <div
        className={`text-base font-black tracking-widest uppercase mb-1 ${
          won
            ? "text-success-500 dark:text-success-400"
            : "text-error-500 dark:text-error-400"
        }`}
      >
        {won ? "Correct" : "Game Over"}
      </div>
      <div className="text-xs text-primary-500 dark:text-primary-200 uppercase">
        The answer was
      </div>
      <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">
        {answer}
      </div>
      <div
        className={`text-sm mt-2 font-medium uppercase ${
          won
            ? "text-success-500 dark:text-success-400"
            : "text-error-500 dark:text-error-400"
        }`}
      >
        {won ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}` : lossMessage}
      </div>
    </div>
  )
}
