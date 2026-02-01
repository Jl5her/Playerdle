import { useState, useEffect, type CSSProperties } from "react"
import { type Player, players, playerId, isSamePlayer } from "@/data/players"
import {
  getDailyPlayer,
  getRandomEasyPlayer,
  getRandomPlayerByDifficulty,
  getTodayKey,
  type ArcadeDifficulty,
} from "@/utils/daily"
import { saveGameResult } from "@/utils/stats"
import { GuessGrid, GuessInput, Button } from "@/components"
import { GameOverModal } from "@/modals"

const MAX_GUESSES = 6
const STORAGE_KEY = "playerdle-state"

export type GameMode = "daily" | "arcade"

interface Props {
  mode: GameMode
  onBack: () => void
  arcadeDifficulty?: ArcadeDifficulty
}

interface SavedState {
  dateKey: string
  guessIds: string[]
}

function loadState(dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: SavedState = JSON.parse(raw)
    if (parsed.dateKey !== dateKey) return []
    return parsed.guessIds ?? []
  } catch {
    return []
  }
}

function saveState(dateKey: string, guessIds: string[]) {
  const state: SavedState = { dateKey, guessIds }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function restoreGuesses(ids: string[]): Player[] {
  const restored: Player[] = []
  for (const id of ids) {
    const p = players.find(pl => playerId(pl) === id)
    if (p) restored.push(p)
  }
  return restored
}

function getInitialPlayer(mode: GameMode, arcadeDifficulty?: ArcadeDifficulty): Player {
  if (mode === "daily") {
    return getDailyPlayer()
  }
  return arcadeDifficulty ? getRandomPlayerByDifficulty(arcadeDifficulty) : getRandomEasyPlayer()
}

function getInitialGuesses(mode: GameMode): Player[] {
  if (mode === "daily") {
    const savedIds = loadState(getTodayKey())
    return savedIds.length > 0 ? restoreGuesses(savedIds) : []
  }
  return []
}

export default function Game({ mode, onBack, arcadeDifficulty }: Props) {
  const [answer, setAnswer] = useState<Player>(() => getInitialPlayer(mode, arcadeDifficulty))
  const [dateKey] = useState<string>(getTodayKey)
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode))
  const [latestIndex, setLatestIndex] = useState(-1)

  const won = answer && guesses.some(g => isSamePlayer(g, answer))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost

  const [showModal, setShowModal] = useState(gameOver)

  const guessedIds = new Set(guesses.map(g => playerId(g)))

  // Save game result when game is over (daily mode only)
  useEffect(() => {
    if (mode === "daily" && gameOver) {
      saveGameResult(won, guesses.length)
    }
  }, [mode, gameOver, won, guesses.length])

  function handleGuess(player: Player) {
    if (gameOver || guessedIds.has(playerId(player))) return
    const newGuesses = [...guesses, player]
    setGuesses(newGuesses)
    setLatestIndex(newGuesses.length - 1)
    if (mode === "daily") {
      saveState(
        dateKey,
        newGuesses.map(g => playerId(g)),
      )
    }
    // Show modal when game ends after this guess
    const newWon = answer && newGuesses.some(g => isSamePlayer(g, answer))
    const newLost = !newWon && newGuesses.length >= MAX_GUESSES
    if (newWon || newLost) {
      setShowModal(true)
    }
  }

  function handlePlayAgain() {
    const newPlayer = arcadeDifficulty
      ? getRandomPlayerByDifficulty(arcadeDifficulty, playerId(answer))
      : getRandomEasyPlayer(playerId(answer))
    setAnswer(newPlayer)
    setGuesses([])
    setLatestIndex(-1)
  }

  return (
    <div style={styles.container}>
      <GameOverModal
        player={answer}
        won={won}
        lost={lost}
        guessCount={guesses.length}
        onPlayAgain={mode === "arcade" ? handlePlayAgain : undefined}
        mode={mode}
        guesses={guesses}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
      {gameOver && (
        <div style={styles.answerCard}>
          <div style={styles.answerLabel}>The answer was</div>
          <div style={styles.answerName}>{answer.name}</div>
          <div style={styles.answerDetails}>
            {answer.team} &middot; {answer.position} &middot; #{answer.number}
          </div>
          <div style={styles.answerMessage}>
            {won ? `Guessed in ${guesses.length}/6` : "Better luck tomorrow!"}
          </div>
        </div>
      )}
      <div style={styles.gridArea}>
        <GuessGrid
          guesses={guesses}
          answer={answer}
          maxGuesses={MAX_GUESSES}
          latestIndex={latestIndex}
        />
      </div>
      <GuessInput
        onGuess={handleGuess}
        guessedIds={guessedIds}
        disabled={gameOver}
      />
      {gameOver && (
        <div style={styles.resultsContainer}>
          <Button
            onClick={() => setShowModal(true)}
            variant="secondary"
          >
            See Results
          </Button>
        </div>
      )}
      <button
        style={styles.backBtn}
        onClick={onBack}
      >
        Menu
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  gridArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
    minHeight: 0,
  },
  answerCard: {
    backgroundColor: "var(--bg-secondary)",
    padding: "0.75rem 1rem",
    textAlign: "center" as const,
    flexShrink: 0,
    borderBottom: "2px solid var(--border)",
  },
  answerLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
  },
  answerName: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text)",
    textTransform: "uppercase" as const,
  },
  answerDetails: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
    textTransform: "uppercase" as const,
  },
  answerMessage: {
    fontSize: "0.9rem",
    color: "var(--green)",
    marginTop: "0.5rem",
    fontWeight: 500,
  },
  resultsContainer: {
    flexShrink: 0,
    padding: "0.75rem",
    paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
    backgroundColor: "var(--bg)",
    display: "flex",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    top: "0.65rem",
    left: "0.75rem",
    padding: "0.3rem 0.6rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--header-text)",
    backgroundColor: "transparent",
    border: "1px solid var(--header-text)",
    borderRadius: "4px",
    cursor: "pointer",
    zIndex: 20,
  },
}
