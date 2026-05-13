import { useEffect, useMemo, useRef, useState } from "react"
import { GuessGrid, GuessInput } from "@/games/playerdle/components"
import { DailyGameShell, Popup, ScrollHint } from "@/shared/components"
import { StatsContent } from "@/games/playerdle/modals/stats-content"
import type { Player, SportConfig } from "@/games/playerdle/sports"
import { getDailyPlayer, getRandomArcadePlayer, getTodayKeyInEasternTime } from "@/games/playerdle/utils/daily"
import { saveGameResult } from "@/games/playerdle/utils/stats"

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
  variantId?: string
}

interface Props {
  mode: GameMode
  sport: SportConfig
  variantId?: string
}

interface SavedState {
  dateKey: string
  guessIds: string[]
}

function getStorageKey(sportId: string, variantId?: string): string {
  return `playerdle-state:${sportId}:${variantId ?? "classic"}`
}

function loadState(sportId: string, dateKey: string, variantId?: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sportId, variantId))
    if (!raw) return []
    const parsed: SavedState = JSON.parse(raw)
    if (parsed.dateKey !== dateKey) return []
    return parsed.guessIds ?? []
  } catch {
    return []
  }
}

function saveState(sportId: string, dateKey: string, guessIds: string[], variantId?: string) {
  const state: SavedState = { dateKey, guessIds }
  localStorage.setItem(getStorageKey(sportId, variantId), JSON.stringify(state))
}

function restoreGuesses(players: Player[], ids: string[]): Player[] {
  const byId = new Map(players.map(player => [player.id, player]))
  return ids.map(id => byId.get(id)).filter(Boolean) as Player[]
}

function getInitialGuesses(mode: GameMode, sport: SportConfig, variantId?: string): Player[] {
  if (mode === "daily") {
    const savedIds = loadState(sport.id, getTodayKeyInEasternTime(), variantId)
    return savedIds.length > 0 ? restoreGuesses(sport.players, savedIds) : []
  }
  return []
}

export default function Game({ mode, sport, variantId }: Props) {
  const [activeMode, setActiveMode] = useState<GameMode>(mode)
  const [answer, setAnswer] = useState<Player | null>(() =>
    mode === "daily" ? getDailyPlayer(sport) : getRandomArcadePlayer(sport),
  )
  const [dateKey] = useState<string>(getTodayKeyInEasternTime)
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode, sport, variantId))
  const [latestIndex, setLatestIndex] = useState(-1)
  const [showPositionPopup, setShowPositionPopup] = useState(false)
  const positionLockedShownRef = useRef(false)

  const won = !!(answer && guesses.some(g => g.id === answer.id))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const isFanatic = variantId === "fanatic"

  const guessedIds = new Set(guesses.map(g => g.id))

  const guessablePlayers = useMemo(() => {
    const allowedPositions = new Set<string>()
    for (const p of sport.answerPool) {
      if (p.position !== undefined && p.position !== null) {
        allowedPositions.add(String(p.position))
      }
    }
    if (allowedPositions.size === 0) return sport.players
    return sport.players.filter(
      p => p.position !== undefined && p.position !== null && allowedPositions.has(String(p.position)),
    )
  }, [sport.players, sport.answerPool])

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      saveGameResult(sport.id, won, guesses.length, variantId)
    }
  }, [activeMode, gameOver, won, guesses.length, sport.id, variantId])

  const gridScrollRef = useRef<HTMLDivElement>(null)

  function handleGuess(player: Player) {
    if (gameOver || guessedIds.has(player.id)) return
    const newGuesses = [...guesses, player]
    setGuesses(newGuesses)
    setLatestIndex(newGuesses.length - 1)
    if (activeMode === "daily") {
      saveState(
        sport.id,
        dateKey,
        newGuesses.map(g => g.id),
        variantId,
      )
    }
    const newWon = !!(answer && newGuesses.some(g => g.id === answer.id))
    const newLost = !newWon && newGuesses.length >= MAX_GUESSES

    if (
      isFanatic &&
      !newWon &&
      !positionLockedShownRef.current &&
      answer &&
      player.position !== undefined &&
      player.position === answer.position
    ) {
      positionLockedShownRef.current = true
      setShowPositionPopup(true)
    }

    if (newWon || newLost) {
      if (activeMode === "daily") {
        saveGameResult(sport.id, newWon, newGuesses.length, variantId)
      }
    }
  }

  function handlePlayAgain() {
    if (!answer) return
    const newPlayer = getRandomArcadePlayer(sport, answer.id)
    setAnswer(newPlayer)
    setGuesses([])
    setLatestIndex(-1)
    positionLockedShownRef.current = false
    setShowPositionPopup(false)
    setActiveMode("arcade")
  }

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={answer?.name}
      onPlayAgain={handlePlayAgain}
      renderResults={({ onPlayAgain }) => (
        <div className="flex-1 min-h-0 overflow-auto px-4">
          <div className="w-full max-w-2xl mx-auto">
            {answer && (
              <StatsContent
                player={answer}
                won={won}
                lost={lost}
                guessCount={guesses.length}
                onPlayAgain={onPlayAgain}
                mode={activeMode}
                guesses={guesses}
                sport={sport}
                includeShareButton={activeMode === "daily"}
                variantId={variantId}
              />
            )}
          </div>
        </div>
      )}
    >
      <Popup
        visible={showPositionPopup}
        message={
          answer?.position ? `Position locked: ${String(answer.position)}` : ""
        }
        durationMs={2500}
      />
      {gameOver && answer && (
        <div
          className={`shrink-0 px-4 py-3 text-center border-b-2 ${
            won
              ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
              : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60"
          }`}
        >
          <div
            className={`text-base font-black tracking-widest uppercase mb-1 ${
              won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400"
            }`}
          >
            {won ? "Correct" : "Game Over"}
          </div>
          <div className="text-xs text-primary-500 dark:text-primary-200 uppercase">
            The answer was
          </div>
          <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">
            {String(answer.name)}
          </div>
          <div
            className={`text-sm mt-2 font-medium uppercase ${
              won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400"
            }`}
          >
            {won
              ? `You got it in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}`
              : "Better luck tomorrow!"}
          </div>
        </div>
      )}
      {answer && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div
            ref={gridScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
          >
            <GuessGrid
              guesses={guesses}
              answer={answer}
              maxGuesses={MAX_GUESSES}
              latestIndex={latestIndex}
              columns={sport.columns}
            />
          </div>
          <ScrollHint scrollRef={gridScrollRef} />
          {!gameOver && (
            <GuessInput
              onGuess={handleGuess}
              guessedIds={guessedIds}
              disabled={gameOver}
              players={guessablePlayers}
            />
          )}
        </div>
      )}
    </DailyGameShell>
  )
}
