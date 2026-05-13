import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import type { ReactNode } from "react"

interface Props {
  won: boolean
  answer: ReactNode
  guessCount: number
  lossMessage?: string
  hideAnswer?: boolean
  onToggleHide?: () => void
}

export default function ResultBanner({
  won,
  answer,
  guessCount,
  lossMessage = "Better luck tomorrow!",
  hideAnswer = false,
  onToggleHide,
}: Props) {
  const statusColor = won
    ? "text-success-500 dark:text-success-400"
    : "text-error-500 dark:text-error-400"

  const answerColor = won
    ? "text-success-800 dark:text-success-300"
    : "text-primary-900 dark:text-primary-50"

  return (
    <div
      className={clsx(
        "shrink-0 px-4 py-2 text-center border-y-2 mt-1",
        won
          ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
          : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60",
      )}
    >
      <div className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", statusColor)}>
        {won ? "Correct" : "Game Over"}
      </div>
      <div className="flex items-center justify-center gap-2 mt-0.5">
        <div
          className={clsx(
            "text-xl font-black uppercase tracking-tight transition-[filter]",
            answerColor,
            hideAnswer && "blur-sm select-none",
          )}
        >
          {answer}
        </div>
        {onToggleHide && (
          <button
            type="button"
            onClick={onToggleHide}
            aria-label={hideAnswer ? "Show answer" : "Hide answer"}
            className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition-colors shrink-0"
          >
            <FontAwesomeIcon
              icon={hideAnswer ? faEye : faEyeSlash}
              className="text-xs"
            />
          </button>
        )}
      </div>
      <div className={clsx("text-xs font-medium uppercase mt-1", statusColor)}>
        {won
          ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
          : lossMessage}
      </div>
    </div>
  )
}
