import type { Player } from "@/data/players"
import { teams, type Team } from "@/data/teams"
import Tile from "./tile"

interface GuessResult {
  guess: Player
  answer: Player
}

interface Props {
  result: GuessResult
  animate?: boolean
}

function getComparison(guess: Player, answer: Player) {
  if (!guess || !answer) {
    return {
      conference: false,
      division: false,
      team: false,
      position: false,
      numberMatch: false,
      numberClose: false,
      numberDirection: "exact" as const,
    }
  }

  const numberDiff = Math.abs(guess.number - answer.number)
  return {
    conference: guess.conference === answer.conference,
    division: guess.division === answer.division,
    team: guess.team === answer.team,
    position: guess.position === answer.position,
    numberMatch: guess.number === answer.number,
    numberClose: numberDiff > 0 && numberDiff <= 5,
    numberDirection:
      guess.number === answer.number
        ? ("exact" as const)
        : guess.number < answer.number
          ? ("higher" as const)
          : ("lower" as const),
  }
}

export default function GuessRow({ result, animate }: Props) {
  if (!result?.guess || !result?.answer) {
    return null
  }

  const comp = getComparison(result.guess, result.answer)

  const teamDisplayAbbr =
    Object.values(teams)
      .find((t: Team) => t.name === result.guess.team)
      ?.abbr.toUpperCase() || result.guess.team

  const cells: { value: string; correct: boolean; close?: boolean; arrow?: string }[] = [
    { value: result.guess.conference, correct: comp.conference },
    { value: result.guess.division.replace(/^(AFC|NFC)\s/, ""), correct: comp.division },
    { value: teamDisplayAbbr, correct: comp.team },
    { value: result.guess.position, correct: comp.position },
    {
      value: String(result.guess.number),
      correct: comp.numberMatch,
      close: comp.numberClose,
      arrow:
        comp.numberDirection === "higher"
          ? "\u2191"
          : comp.numberDirection === "lower"
            ? "\u2193"
            : "",
    },
  ]

  return (
    <div>
      <div className="text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none">{result.guess.name}</div>
      <div className="flex gap-1 justify-center">
        {cells.map((cell, i) => (
          <Tile
            key={i}
            cell={cell}
            animate={animate}
            delay={i * 0.15}
          />
        ))}
      </div>
    </div>
  )
}
