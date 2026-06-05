import type { Player, SportColumn } from "@/games/playerdle/sports"
import { type GuessGridRow, GuessGrid as SharedGuessGrid } from "@/shared/components"
import { buildGuessCells } from "./guess-row"

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
  const rows: GuessGridRow[] = guesses.map((guess, i) => ({
    id: `${guess.id}-${i}`,
    label: String(guess.name),
    cells: buildGuessCells(guess, answer, columns),
    muted: hideAnswer && guess.id === answer.id,
  }))

  const hasBackfilledGuess = guesses.some(g => g.numberBackfilled)
  const footer = hasBackfilledGuess ? (
    <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
      * Jersey number from previous team
    </p>
  ) : undefined

  return (
    <SharedGuessGrid
      headers={columns.map(column => column.label)}
      headerTooltips={columns.map(column => column.description)}
      rows={rows}
      maxRows={maxGuesses}
      columnCount={columns.length}
      latestIndex={latestIndex}
      footer={footer}
    />
  )
}
