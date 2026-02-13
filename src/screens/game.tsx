import { useState, useEffect } from "react"
import type { Player, SportConfig } from "@/sports"
import { getDailyPlayer, getRandomArcadePlayer, getTodayKeyInEasternTime } from "@/utils/daily"
import { saveGameResult } from "@/utils/stats"
import { GuessGrid, GuessInput, Button } from "@/components"

const MAX_GUESSES = 6

export type GameMode = "daily" | "arcade"

export interface StatsModalConfig {
  player?: Player
  won?: boolean
  lost?: boolean
  guessCount?: number
  onPlayAgain?: () => void
  mode: GameMode
  guesses?: Player[]
  showStatsOnly?: boolean
  includeShareButton?: boolean
}

interface Props {
  mode: GameMode
  sport: SportConfig
  onOpenStatsModal: (config: StatsModalConfig) => void
}

interface SavedState {
  dateKey: string
  guessIds: string[]
}

function getStorageKey(sportId: string): string {
  return `playerdle-state:${sportId}`
}

function loadState(sportId: string, dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sportId))
    if (!raw) return []
    const parsed: SavedState = JSON.parse(raw)
    if (parsed.dateKey !== dateKey) return []
    return parsed.guessIds ?? []
  } catch {
    return []
  }
}

function saveState(sportId: string, dateKey: string, guessIds: string[]) {
  const state: SavedState = { dateKey, guessIds }
  localStorage.setItem(getStorageKey(sportId), JSON.stringify(state))
}

function restoreGuesses(players: Player[], ids: string[]): Player[] {
  const byId = new Map(players.map(player => [player.id, player]))
  return ids.map(id => byId.get(id)).filter(Boolean) as Player[]
}

function getInitialGuesses(mode: GameMode, sport: SportConfig): Player[] {
  if (mode === "daily") {
    const savedIds = loadState(sport.id, getTodayKeyInEasternTime())
    return savedIds.length > 0 ? restoreGuesses(sport.players, savedIds) : []
  }
  return []
}

export default function Game({ mode, sport, onOpenStatsModal }: Props) {
  const [answer, setAnswer] = useState<Player | null>(() =>
    mode === "daily" ? getDailyPlayer(sport) : getRandomArcadePlayer(sport),
  )
  const [dateKey] = useState<string>(getTodayKeyInEasternTime)
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode, sport))
  const [latestIndex, setLatestIndex] = useState(-1)

  const won = !!(answer && guesses.some(g => g.id === answer.id))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost

  const guessedIds = new Set(guesses.map(g => g.id))

  useEffect(() => {
    if (mode === "daily" && gameOver) {
      saveGameResult(sport.id, won, guesses.length)
    }
  }, [mode, gameOver, won, guesses.length, sport.id])

  function openResultsModal(nextGuesses: Player[], nextWon: boolean, nextLost: boolean) {
    if (!answer) return

    onOpenStatsModal({
      player: answer,
      won: nextWon,
      lost: nextLost,
      guessCount: nextGuesses.length,
      onPlayAgain: mode === "arcade" ? handlePlayAgain : undefined,
      mode,
      guesses: nextGuesses,
      includeShareButton: mode === "daily",
    })
  }

  function handleGuess(player: Player) {
    if (gameOver || guessedIds.has(player.id)) return
    const newGuesses = [...guesses, player]
    setGuesses(newGuesses)
    setLatestIndex(newGuesses.length - 1)
    if (mode === "daily") {
      saveState(
        sport.id,
        dateKey,
        newGuesses.map(g => g.id),
      )
    }
    const newWon = !!(answer && newGuesses.some(g => g.id === answer.id))
    const newLost = !newWon && newGuesses.length >= MAX_GUESSES
    if (newWon || newLost) {
      if (mode === "daily") {
        saveGameResult(sport.id, newWon, newGuesses.length)
      }
      openResultsModal(newGuesses, newWon, newLost)
    }
  }

  function handlePlayAgain() {
    if (!answer) return
    const newPlayer = getRandomArcadePlayer(sport, answer.id)
    setAnswer(newPlayer)
    setGuesses([])
    setLatestIndex(-1)
  }

  return (
    <div className="flex-1 flex flex-col bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 overflow-hidden">
      {gameOver && answer && (
        <div className="bg-secondary-50 dark:bg-secondary-900 px-4 py-3 text-center shrink-0 border-b-2 border-secondary-300 dark:border-secondary-700">
          <div className="text-xs text-primary-500 dark:text-primary-200 mb-1">The answer was</div>
          <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">
            {String(answer.name)}
          </div>
          <div className="text-sm text-primary-500 dark:text-primary-200 mt-0.5 uppercase">
            {String(answer.team ?? "")} &middot; {String(answer.position ?? "")} &middot; #
            {String(answer.number ?? "")}
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
              columns={sport.columns}
            />
          </div>
          <GuessInput
            onGuess={handleGuess}
            guessedIds={guessedIds}
            disabled={gameOver}
            players={sport.players}
          />
        </>
      )}
      {gameOver && (
        <div className="shrink-0 px-3 py-3 bg-primary-50 dark:bg-primary-900 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={() => openResultsModal(guesses, won, lost)}
            variant="secondary"
          >
            See Results
          </Button>
        </div>
      )}
    </div>
  )
}
