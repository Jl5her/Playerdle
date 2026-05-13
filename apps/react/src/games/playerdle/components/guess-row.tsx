import clsx from "clsx"
import type { ReactNode } from "react"
import {
  type EvaluatedCell,
  evaluateColumn,
  type Player,
  type SportColumn,
} from "@/games/playerdle/sports"
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

function statusColorClass(status: EvaluatedCell["status"]): string {
  if (status === "correct") return "text-success-600 dark:text-success-700"
  if (status === "close") return "text-warning-600 dark:text-warning-700"
  return "text-error-600 dark:text-error-700"
}

type Phrasing = "team" | "position" | "group" | "generic"

function matchPhrasing(columnId: string): Phrasing {
  if (columnId === "team") return "team"
  if (columnId === "position") return "position"
  if (columnId === "conference" || columnId === "division" || columnId === "league") return "group"
  return "generic"
}

function buildMatchTooltip(
  column: SportColumn,
  status: EvaluatedCell["status"],
  label: ReactNode,
  value: ReactNode,
): ReactNode {
  const kind = matchPhrasing(column.id)
  if (status === "correct") {
    if (kind === "team") return <>Correct! They play for {value}.</>
    if (kind === "position") return <>Correct! They play {value}.</>
    if (kind === "group") return <>Correct! They're in {value}.</>
    return (
      <>
        Correct {label} — {value}.
      </>
    )
  }
  if (kind === "team") return <>Not {value} — they're on a different team.</>
  if (kind === "position") return <>Not {value} — they play a different position.</>
  if (kind === "group")
    return (
      <>
        Not {value} — they're in a different {label}.
      </>
    )
  return (
    <>
      Wrong {label} — {value} doesn't match.
    </>
  )
}

function buildComparisonTooltip(
  status: EvaluatedCell["status"],
  arrow: string | undefined,
  label: ReactNode,
  value: ReactNode,
): ReactNode {
  const direction = arrow === "↑" ? "higher" : arrow === "↓" ? "lower" : null

  if (status === "correct") {
    return (
      <>
        Exact {label} — {value}.
      </>
    )
  }
  if (status === "close") {
    if (direction) {
      return (
        <>
          Close — their {label} is {direction} than {value}.
        </>
      )
    }
    return <>Close to {value}.</>
  }
  if (direction) {
    return (
      <>
        Their {label} is much {direction} than {value}.
      </>
    )
  }
  return (
    <>
      Wrong {label} — {value}.
    </>
  )
}

function buildTooltip(column: SportColumn, evaluated: EvaluatedCell): ReactNode {
  const label = <strong className="font-bold">{column.label}</strong>
  const value = (
    <em className={clsx("italic font-bold", statusColorClass(evaluated.status))}>
      {evaluated.value || "—"}
    </em>
  )

  if (column.evaluator.type === "match") {
    return buildMatchTooltip(column, evaluated.status, label, value)
  }

  if (column.evaluator.type === "mismatch") {
    if (evaluated.status === "correct") {
      return <>{label} differs from your guess — that's correct.</>
    }
    return <>{label} matches your guess — but they shouldn't.</>
  }

  return buildComparisonTooltip(evaluated.status, evaluated.arrow, label, value)
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
      tooltip: buildTooltip(column, evaluated),
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
