import type { CSSProperties } from "react";
import type { Player } from "../data/players";

interface GuessResult {
  guess: Player;
  answer: Player;
}

interface Props {
  result: GuessResult;
  animate?: boolean;
}

const teamAbbreviations: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
};

function getComparison(guess: Player, answer: Player) {
  const numberDiff = Math.abs(guess.number - answer.number);
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
  };
}

export default function GuessRow({ result, animate }: Props) {
  const comp = getComparison(result.guess, result.answer);

  const cells: { value: string; correct: boolean; close?: boolean; arrow?: string }[] = [
    { value: result.guess.conference, correct: comp.conference },
    { value: result.guess.division.replace(/^(AFC|NFC)\s/, ""), correct: comp.division },
    { value: teamAbbreviations[result.guess.team] || result.guess.team, correct: comp.team },
    { value: result.guess.position, correct: comp.position },
    {
      value: String(result.guess.number),
      correct: comp.numberMatch,
      close: comp.numberClose,
      arrow: comp.numberDirection === "higher" ? "\u2191" : comp.numberDirection === "lower" ? "\u2193" : "",
    },
  ];

  return (
    <div style={styles.row}>
      <div style={styles.name}>{result.guess.name}</div>
      <div style={styles.cells}>
        {cells.map((cell, i) => {
          const tileClass = cell.correct
            ? "tile tile--correct"
            : cell.close
              ? "tile tile--close"
              : "tile tile--wrong";

          return (
            <div
              key={i}
              className={`${tileClass}${animate ? " cell-flip" : ""}`}
              style={{
                ...styles.cell,
                animationDelay: animate ? `${i * 0.15}s` : undefined,
              }}
            >
              <span style={styles.cellValue}>
                {cell.value}
                {cell.arrow && <span style={styles.arrow}>{cell.arrow}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  row: {
    marginBottom: "0.5rem",
  },
  name: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: "0.2rem",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cells: {
    display: "flex",
    gap: "0.25rem",
    justifyContent: "center",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "clamp(2.5rem, 17vw, 5.5rem)",
    height: "clamp(2.3rem, 14vw, 4.5rem)",
    fontWeight: 700,
    lineHeight: 1.1,
    padding: "0.15rem",
  },
  cellValue: {
    fontSize: "clamp(0.6rem, 2.8vw, 0.9rem)",
    textAlign: "center",
    wordBreak: "break-word",
    position: "relative",
    zIndex: 1,
  },
  arrow: {
    marginLeft: "0.15rem",
    fontSize: "0.85em",
  },
};
