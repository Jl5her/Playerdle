import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import type { ReactNode } from "react"

interface Props {
  won: boolean
  answer: ReactNode
  guessCount: number
  team?: string
  position?: string
  number?: string
  lossMessage?: string
  hideAnswer?: boolean
  onToggleHide?: () => void
}

export default function ResultBanner({
  won,
  answer,
  guessCount,
  team,
  position,
  number,
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

  const eyeColor = won
    ? "text-success-400 hover:text-success-600 dark:text-success-400 dark:hover:text-success-300"
    : "text-error-400 hover:text-error-600 dark:text-error-400 dark:hover:text-error-300"

  return (
    <div
      className={clsx(
        "relative shrink-0 px-4 py-2 text-center border-y-2 -mt-0.5",
        won
          ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
          : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60",
      )}
    >
      <div className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", statusColor)}>
        {won ? "Correct" : "Game Over"}
      </div>
      <div className="flex items-center justify-center mt-0.5">
        <div
          className={clsx(
            "text-xl font-black uppercase tracking-tight transition-[filter,opacity] duration-200",
            answerColor,
            hideAnswer && "blur select-none opacity-40",
          )}
        >
          {answer}
        </div>
      </div>
      {(team || position || number) && (
        <div
          className={clsx(
            "text-[11px] font-medium uppercase tracking-wide mt-0.5 text-primary-500 dark:text-primary-300 transition-[filter,opacity] duration-200",
            hideAnswer && "blur select-none opacity-40",
          )}
        >
          {[team, position, number ? `#${number}` : undefined].filter(Boolean).join(" · ")}
        </div>
      )}
      <div className={clsx("text-xs font-medium uppercase mt-1", statusColor)}>
        {won
          ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
          : lossMessage}
      </div>
      {onToggleHide && (
        <button
          type="button"
          onClick={onToggleHide}
          aria-label={hideAnswer ? "Show answer" : "Hide answer"}
          className={clsx(
            "absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors",
            eyeColor,
          )}
        >
          <FontAwesomeIcon
            icon={hideAnswer ? faEye : faEyeSlash}
            className="text-lg"
          />
        </button>
      )}
    </div>
  )
}
