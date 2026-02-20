import { evaluateColumn, type Player, type SportColumn } from "@/sports"
import Tile from "./tile"

interface GuessResult {
  guess: Player
  answer: Player
}

interface Props {
  result: GuessResult
  columns: SportColumn[]
  animate?: boolean
}

export default function GuessRow({ result, columns, animate }: Props) {
  if (!result?.guess || !result?.answer) {
    return null
  }

  const cells = columns.map(column => {
    const evaluated = evaluateColumn(result.guess, result.answer, column)
    return {
      value: evaluated.value,
      renderedValue: column.renderValue?.(evaluated.value, { player: result.guess }),
      arrow: evaluated.arrow,
      correct: evaluated.status === "correct",
      close: evaluated.status === "close",
    }
  })

  return (
    <div>
      <div className="px-2 py-1 text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none">
        {String(result.guess.name)}
      </div>
      <div className="flex gap-1 justify-center">
        {cells.map((cell, i) => (
          <Tile
            key={i}
            cell={cell}
            animate={animate}
            delayIndex={i}
          />
        ))}
      </div>
    </div>
  )
}
