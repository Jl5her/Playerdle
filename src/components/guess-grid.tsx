import type { CSSProperties } from "react"
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
    <div style={styles.grid}>
      {/* Column headers */}
      <div style={styles.headerRow}>
        <div style={styles.headerSpacer} />
        <div style={styles.headerCells}>
          {LABELS.map(label => (
            <div
              key={label}
              style={styles.headerCell}
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
          style={styles.emptyRow}
        >
          <div style={styles.emptyName}>&nbsp;</div>
          <div style={styles.emptyCells}>
            {LABELS.map((_, j) => (
              <div
                key={j}
                style={styles.emptyCell}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.5rem 0.5rem 0",
  },
  headerRow: {
    marginBottom: "0.35rem",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  headerSpacer: {
    height: "0.75rem",
  },
  headerCells: {
    display: "flex",
    gap: "0.25rem",
    justifyContent: "center",
  },
  headerCell: {
    width: "clamp(3rem, 17vw, 5.5rem)",
    textAlign: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  emptyRow: {
    marginBottom: "0.5rem",
  },
  emptyName: {
    height: "0.95rem",
    marginBottom: "0.2rem",
  },
  emptyCells: {
    display: "flex",
    gap: "0.25rem",
    justifyContent: "center",
  },
  emptyCell: {
    width: "clamp(3rem, 17vw, 5.5rem)",
    height: "clamp(2.8rem, 14vw, 4.5rem)",
    borderRadius: "0.375rem",
    backgroundColor: "var(--empty-cell-bg)",
    border: "2px solid var(--empty-cell-border)",
  },
}
