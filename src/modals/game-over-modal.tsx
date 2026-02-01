import { useEffect, useState, type CSSProperties } from "react"
import confetti from "canvas-confetti"
import type { Player } from "@/data/players"
import type { GameMode } from "@/screens/game"
import { calculateStats } from "@/utils/stats"
import { teams, type Team } from "@/data/teams"

interface Props {
  player: Player
  won: boolean
  lost: boolean
  guessCount: number
  onPlayAgain?: () => void
  mode: GameMode
  guesses: Player[]
  isOpen: boolean
  onClose: () => void
}

function getTeamColors(teamName: string): [string, string] {
  const team = Object.values(teams).find((t: Team) => t.name === teamName)
  return team?.colors || ["#538d4e", "#b59f3b"]
}

function getComparison(guess: Player, answer: Player) {
  const numberDiff = Math.abs(guess.number - answer.number)
  return {
    conference: guess.conference === answer.conference,
    division: guess.division === answer.division,
    team: guess.team === answer.team,
    position: guess.position === answer.position,
    numberMatch: guess.number === answer.number,
    numberClose: numberDiff > 0 && numberDiff <= 5,
  }
}

function generateShareText(guesses: Player[], answer: Player, won: boolean): string {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  })
  const result = won ? `${guesses.length}/6` : "X/6"

  let text = `Playerdle ${dateStr} ${result}\n\n`

  for (const guess of guesses) {
    const comp = getComparison(guess, answer)
    const conf = comp.conference ? "🟩" : "⬜"
    const div = comp.division ? "🟩" : "⬜"
    const team = comp.team ? "🟩" : "⬜"
    const pos = comp.position ? "🟩" : "⬜"
    const num = comp.numberMatch ? "🟩" : comp.numberClose ? "🟨" : "⬜"
    text += `${conf}${div}${team}${pos}${num}\n`
  }

  return text.trim()
}

export default function GameOverModal({
  player,
  won,
  lost,
  guessCount,
  onPlayAgain,
  mode,
  guesses,
  isOpen,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false)
  const stats = mode === "daily" ? calculateStats() : null
  const maxGuessCount = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  async function handleShare() {
    const shareText = generateShareText(guesses, player, won)

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  useEffect(() => {
    if (!won || !player?.team) return

    const duration = 3000
    const end = Date.now() + duration
    const colors = getTeamColors(player.team)

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0 },
        colors: colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0 },
        colors: colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [won, player?.team])

  if (!won && !lost) return null
  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={won && mode === "arcade" && onPlayAgain ? undefined : undefined}
    >
      <div
        style={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        <button
          style={styles.closeButton}
          onClick={onClose}
        >
          ✕
        </button>
        <div style={styles.content}>
          {mode === "daily" ? (
            <>
              <h2 style={styles.heading}>Statistics</h2>
            </>
          ) : (
            <>
              {won ? (
                <>
                  <div style={styles.emoji}>&#127942;</div>
                  <div style={styles.playerName}>{player.name}</div>
                  <div style={styles.subtitle}>
                    {player.team} &middot; {player.position} &middot; #{player.number}
                  </div>
                  <div style={styles.result}>Guessed in {guessCount}/6</div>
                </>
              ) : (
                <>
                  <div style={styles.lostLabel}>The answer was</div>
                  <div style={styles.playerName}>{player.name}</div>
                  <div style={styles.subtitle}>
                    {player.team} &middot; {player.position} &middot; #{player.number}
                  </div>
                  <div style={styles.result}>Better luck tomorrow!</div>
                </>
              )}
            </>
          )}

          {mode === "daily" && stats && (
            <div style={styles.statsSection}>
              <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{stats.played}</div>
                  <div style={styles.statLabel}>Played</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{stats.winPercentage}</div>
                  <div style={styles.statLabel}>Win %</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{stats.currentStreak}</div>
                  <div style={styles.statLabel}>
                    Current
                    <br />
                    Streak
                  </div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{stats.maxStreak}</div>
                  <div style={styles.statLabel}>
                    Max
                    <br />
                    Streak
                  </div>
                </div>
              </div>

              <div style={styles.distribution}>
                <h3 style={styles.distributionTitle}>Guess Distribution</h3>
                {[1, 2, 3, 4, 5, 6].map(guessNum => {
                  const count = stats.guessDistribution[guessNum] || 0
                  const percentage = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0

                  return (
                    <div
                      key={guessNum}
                      style={styles.distributionRow}
                    >
                      <div style={styles.distributionLabel}>{guessNum}</div>
                      <div style={styles.distributionBarContainer}>
                        <div
                          style={{
                            ...styles.distributionBar,
                            width: `${Math.max(percentage, count > 0 ? 7 : 0)}%`,
                          }}
                        >
                          <span style={styles.distributionCount}>{count}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={styles.buttonRow}>
            {mode === "daily" && (
              <button
                style={styles.shareBtn}
                onClick={handleShare}
              >
                <svg
                  style={styles.shareIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="15"
                  ></line>
                </svg>
                {copied ? "Copied!" : "Share"}
              </button>
            )}
            {onPlayAgain && (
              <button
                style={styles.playAgainBtn}
                onClick={onPlayAgain}
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "var(--bg)",
    borderRadius: "8px",
    maxWidth: "400px",
    width: "100%",
    border: "2px solid var(--border)",
    position: "relative" as const,
  },
  closeButton: {
    position: "absolute" as const,
    top: "0.75rem",
    right: "0.75rem",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem",
    lineHeight: 1,
    transition: "color 0.2s",
    zIndex: 1,
  },
  content: {
    textAlign: "center",
    padding: "2rem 1.5rem",
  },
  heading: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "1rem",
    marginTop: 0,
    textTransform: "uppercase" as const,
    textAlign: "left" as const,
  },
  emoji: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  playerName: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--text)",
    textTransform: "uppercase" as const,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
    textTransform: "uppercase" as const,
  },
  result: {
    fontSize: "1rem",
    color: "var(--green)",
    fontWeight: 700,
    marginTop: "0.75rem",
    textTransform: "uppercase" as const,
  },
  lostLabel: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
    textTransform: "uppercase" as const,
  },
  buttonRow: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    marginTop: "1.5rem",
  },
  shareBtn: {
    padding: "0.65rem 1.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "var(--primary, #538d4e)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  shareIcon: {
    width: "1rem",
    height: "1rem",
  },
  playAgainBtn: {
    padding: "0.65rem 1.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "var(--green)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    textTransform: "uppercase" as const,
  },
  answerSection: {
    marginBottom: "1.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "2px solid var(--border)",
  },
  statsSection: {
    marginTop: "1rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },
  statBox: {
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: "2.5rem",
    fontWeight: 300,
    color: "var(--text)",
  },
  statLabel: {
    fontSize: "0.65rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
    lineHeight: 1.3,
    fontWeight: 300,
  },
  distribution: {
    marginTop: "1rem",
  },
  distributionTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "0.75rem",
    textTransform: "uppercase" as const,
    textAlign: "left" as const,
  },
  distributionRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "0.4rem",
    gap: "0.5rem",
  },
  distributionLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text)",
    width: "1rem",
    flexShrink: 0,
  },
  distributionBarContainer: {
    flex: 1,
    position: "relative" as const,
  },
  distributionBar: {
    backgroundColor: "var(--text-secondary)",
    padding: "0.25rem 0.4rem",
    borderRadius: "2px",
    minWidth: "2rem",
    transition: "width 0.3s ease",
  },
  distributionCount: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--bg)",
  },
}
