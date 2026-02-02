import { useState, useEffect } from "react"
import { type Player, players, playerId, isSamePlayer } from "@/data/players"
import { getDailyPlayer, getRandomArcadePlayer, getTodayKey } from "@/utils/daily"
import { saveGameResult } from "@/utils/stats"
import { GuessGrid, GuessInput, Button } from "@/components"
import { GameOverModal, ArcadeSettingsModal } from "@/modals"
import { shouldShowArcadeSettings, type ArcadeSettings } from "@/modals/arcade-settings-modal"

const MAX_GUESSES = 6
const STORAGE_KEY = "playerdle-state"

export type GameMode = "daily" | "arcade"

interface Props {
  mode: GameMode
  onRegisterSettings?: (callback: () => void) => void
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

function getInitialGuesses(mode: GameMode): Player[] {
  if (mode === "daily") {
    const savedIds = loadState(getTodayKey())
    return savedIds.length > 0 ? restoreGuesses(savedIds) : []
  }
  return []
}

export default function Game({ mode, onRegisterSettings }: Props) {
  const [includeDefensiveST, setIncludeDefensiveST] = useState(false)
  const [showArcadeSettings, setShowArcadeSettings] = useState(mode === "arcade" && shouldShowArcadeSettings())
  const [gameStarted, setGameStarted] = useState(mode === "daily" || !shouldShowArcadeSettings())
  const [answer, setAnswer] = useState<Player | null>(() =>
    mode === "daily" ? getDailyPlayer() : (shouldShowArcadeSettings() ? null : getRandomArcadePlayer(undefined, false)),
  )
  const [dateKey] = useState<string>(getTodayKey)
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode))
  const [latestIndex, setLatestIndex] = useState(-1)

  const won = answer && guesses.some(g => isSamePlayer(g, answer))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost

  const [showModal, setShowModal] = useState(gameOver)

  const guessedIds = new Set(guesses.map(g => playerId(g)))

  // Register arcade settings callback with parent
  useEffect(() => {
    if (mode === "arcade" && onRegisterSettings) {
      onRegisterSettings(() => () => setShowArcadeSettings(true))
    }
  }, [mode, onRegisterSettings])

  // Save game result when game is over (daily mode only)
  useEffect(() => {
    if (mode === "daily" && gameOver && won !== null) {
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
    const newPlayer = getRandomArcadePlayer(playerId(answer!), includeDefensiveST)
    setAnswer(newPlayer)
    setGuesses([])
    setLatestIndex(-1)
  }

  function handleArcadeSettingsStart(settings: ArcadeSettings) {
    setIncludeDefensiveST(settings.includeDefensiveST)
    const newPlayer = getRandomArcadePlayer(undefined, settings.includeDefensiveST)
    setAnswer(newPlayer)
    setShowArcadeSettings(false)
    setGameStarted(true)
  }

  function handleCloseArcadeSettings() {
    // If game hasn't started yet, start with default settings
    if (!gameStarted) {
      handleArcadeSettingsStart({ includeDefensiveST: false })
    } else {
      setShowArcadeSettings(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 overflow-hidden">
      {mode === "arcade" && (
        <ArcadeSettingsModal
          isOpen={showArcadeSettings}
          onStart={handleArcadeSettingsStart}
          onClose={handleCloseArcadeSettings}
          initialSettings={{ includeDefensiveST }}
        />
      )}
      {answer && (
        <GameOverModal
          player={answer}
          won={won ?? false}
          lost={lost ?? false}
          guessCount={guesses.length}
          onPlayAgain={mode === "arcade" ? handlePlayAgain : undefined}
          mode={mode}
          guesses={guesses}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
      {gameOver && answer && (
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
      {answer && (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
        </>
      )}
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
    </div>
  )
}
