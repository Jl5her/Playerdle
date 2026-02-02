import { useEffect, useRef } from "react"
import type { Player } from "@/data/players"
import { GuessRow } from "@/components"

interface GuessGridProps {
  guesses: Player[]
  answer: Player
  maxGuesses: number
  latestIndex: number
}

const LABELS = ["CONF", "DIV", "TEAM", "POS", "#"] as const

export default function GuessGrid({ guesses, answer, maxGuesses, latestIndex }: Readonly<GuessGridProps>) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (latestIndex < 0) return
    // Scroll the next empty row into view, or the last guess if grid is full
    const scrollTarget = latestIndex + 1 < maxGuesses ? latestIndex + 1 : latestIndex
    const el = rowRefs.current[scrollTarget]
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex, maxGuesses])

  return (
    <div className="flex flex-col items-center gap-1 px-2 pt-1 pb-1">
      {/* Column headers */}
      <div className="sticky top-0 z-10 flex gap-1 justify-center py-1 bg-primary-50 dark:bg-primary-900">
        {LABELS.map(label => (
          <div
            key={label}
            className="text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
            style={{ width: "clamp(2.5rem, 16vw, 5rem)" }}
          >
            {label}
          </div>
        ))}
      </div>

      {Array.from({ length: maxGuesses }).map((_, i) =>
      (i < guesses.length ? <div key={i} ref={el => { rowRefs.current[i] = el }}><GuessRow
        result={{ guess: guesses[i], answer }}
        animate={i === latestIndex}
      /></div> :
        <div
          key={`empty-${i}`}
          ref={el => { rowRefs.current[i] = el }}
        >
          <div className="flex gap-1 justify-center">
            {LABELS.map((_, j) => (
              <div
                key={j}
                className="rounded-md bg-primary-50 border-2 border-primary-300 dark:bg-primary-900 dark:border-primary-700"
                style={{
                  width: "clamp(2.5rem, 16vw, 5rem)",
                  height: "clamp(2.5rem, 16vw, 5rem)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
