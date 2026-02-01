import { useState, useEffect } from "react"
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
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50">
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
        <div className="bg-secondary-50 dark:bg-secondary-900 px-4 py-3 text-center shrink-0 border-b-2 border-secondary-300 dark:border-secondary-700">
          <div className="text-xs text-primary-500 dark:text-primary-200 mb-1">The answer was</div>
          <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">{answer.name}</div>
          <div className="text-sm text-primary-500 dark:text-primary-200 mt-0.5 uppercase">
            {answer.team} &middot; {answer.position} &middot; #{answer.number}
          </div>
          <div className="text-sm text-success-500 dark:text-success-400 mt-2 font-medium">
            {won ? `Guessed in ${guesses.length}/6` : "Better luck tomorrow!"}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center overflow-hidden min-h-0">
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
        <div className="shrink-0 px-3 py-3 bg-primary-50 dark:bg-primary-900 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={() => setShowModal(true)}
            variant="secondary"
          >
            See Results
          </Button>
        </div>
      )}
      <button
        className="absolute top-2.5 left-3 px-2.5 py-1.5 text-xs font-semibold text-primary-900 dark:text-primary-50 bg-transparent border border-primary-300 dark:border-primary-700 rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-all"
        onClick={onBack}
      >
        Menu
      </button>
    </div>
  )
}
