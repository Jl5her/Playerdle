import clsx from "clsx"
import { useEffect, useRef } from "react"
import { GuessRow } from "@/games/playerdle/components"
import type { Player, SportColumn } from "@/games/playerdle/sports"

interface GuessGridProps {
  guesses: Player[]
  answer: Player
  maxGuesses: number
  latestIndex: number
  columns: SportColumn[]
  hideAnswer?: boolean
}

export default function GuessGrid({
  guesses,
  answer,
  maxGuesses,
  latestIndex,
  columns,
  hideAnswer = false,
}: Readonly<GuessGridProps>) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const isCompactLayout = columns.length > 5

  useEffect(() => {
    if (latestIndex < 0) return
    const el = rowRefs.current[latestIndex]
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex])

  const hasBackfilledGuess = guesses.some(g => g.numberBackfilled)

  return (
    <div
      className={clsx(
        "guess-grid-shell flex flex-col items-center gap-1 px-2 pt-1 pb-1",
        isCompactLayout ? "guess-grid-compact" : "",
      )}
    >
      {/* Column headers */}
      <div className="guess-grid-header sticky top-0 z-20 flex gap-1 justify-center py-1 bg-primary-50 dark:bg-primary-900">
        {columns.map(column => (
          <div
            key={column.id}
            className="grid-cell-width text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
          >
            {column.label}
          </div>
        ))}
      </div>

      {Array.from({ length: maxGuesses }).map((_, i) =>
        i < guesses.length ? (
          <div
            key={i}
            ref={el => {
              rowRefs.current[i] = el
            }}
            className={clsx(
              hideAnswer &&
                guesses[i].id === answer.id &&
                "blur select-none opacity-40 transition-[filter,opacity] duration-200",
            )}
          >
            <GuessRow
              result={{ guess: guesses[i], answer }}
              columns={columns}
              animate={i === latestIndex}
            />
          </div>
        ) : (
          <div
            key={`empty-${i}`}
            ref={el => {
              rowRefs.current[i] = el
            }}
          >
            <div className="flex gap-1 justify-center">
              {columns.map(column => (
                <div
                  key={column.id}
                  className="grid-cell-size rounded-md bg-primary-50 border border-primary-200 dark:bg-primary-900 dark:border-primary-600"
                />
              ))}
            </div>
          </div>
        ),
      )}

      {hasBackfilledGuess && (
        <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
          * Jersey number from previous team
        </p>
      )}
    </div>
  )
}
