import { useEffect, useMemo, useRef, useState } from "react"
import { Button, GuessGrid, GuessInput, Popup, ScrollHint } from "@/components"
import type { Player, SportConfig } from "@/sports"
import { getDailyPlayer, getRandomArcadePlayer, getTodayKeyInEasternTime } from "@/utils/daily"
import { saveGameResult } from "@/utils/stats"

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
  onOpenStatsModal: (config: StatsModalConfig) => void
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

export default function Game({ mode, sport, variantId, onOpenStatsModal }: Props) {
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

  const autoOpenedRef = useRef(false)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only auto-open
  useEffect(() => {
    if (autoOpenedRef.current) return
    if (gameOver && answer) {
      autoOpenedRef.current = true
      openResultsModal(guesses, won, lost)
    }
  }, [])

  function openResultsModal(nextGuesses: Player[], nextWon: boolean, nextLost: boolean) {
    if (!answer) return

    onOpenStatsModal({
      player: answer,
      won: nextWon,
      lost: nextLost,
      guessCount: nextGuesses.length,
      onPlayAgain: handlePlayAgain,
      mode: activeMode,
      guesses: nextGuesses,
      includeShareButton: activeMode === "daily",
      variantId,
    })
  }

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
      if (newWon) {
        openResultsModal(newGuesses, newWon, newLost)
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
    <div className="flex-1 min-h-0 flex flex-col bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 overflow-hidden relative">
      <Popup
        visible={gameOver && !!answer}
        message={answer?.name ?? ""}
      />
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
