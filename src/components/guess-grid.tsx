import type { Player } from "@/data/players"
import { GuessRow } from "@/components"

interface Props {
  guesses: Player[]
  answer: Player
  maxGuesses: number
  latestIndex: number
}

const LABELS = ["CONF", "DIV", "TEAM", "POS", "#"] as const

export default function GuessGrid({ guesses, answer, maxGuesses, latestIndex }: Props) {
  const emptySlots = maxGuesses - guesses.length

  return (
    <div className="flex flex-col items-center px-2 pt-0 pb-2">
      {/* Column headers */}
      <div className="mb-1.5 w-full flex flex-col items-center">
        <div className="h-3" />
        <div className="flex gap-1 justify-center">
          {LABELS.map(label => (
            <div
              key={label}
              className="text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
              style={{ width: "clamp(3rem, 17vw, 5.5rem)" }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {guesses.map((guess, i) => (
        <GuessRow
          key={i}
          result={{ guess, answer }}
          animate={i === latestIndex}
        />
      ))}

      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="mb-2"
        >
          <div className="mb-0.5" style={{ height: "0.95rem" }}>&nbsp;</div>
          <div className="flex gap-1 justify-center">
            {LABELS.map((_, j) => (
              <div
                key={j}
                className="rounded-md bg-primary-50 border-2 border-primary-300 dark:bg-primary-900 dark:border-primary-700"
                style={{
                  width: "clamp(3rem, 17vw, 5.5rem)",
                  height: "clamp(2.8rem, 14vw, 4.5rem)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
