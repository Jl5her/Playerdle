import type { GameMode } from "@playerdle/types"
import { useEffect, useMemo, useRef, useState } from "react"
import { GuessGrid, GuessInput } from "@/games/playerdle/components"
import { StatsContent } from "@/games/playerdle/modals/stats-content"
import type { Player, SportConfig } from "@/games/playerdle/sports"
import {
  getDailyPlayer,
  getRandomArcadePlayer,
  getTodayKey,
} from "@/games/playerdle/utils/daily"
import { saveGameResult } from "@/games/playerdle/utils/stats"
import { DailyGameShell, Popup, ResultBanner, ScrollHint } from "@/shared/components"
import { useWinConfetti } from "@/shared/hooks/use-win-confetti"

const MAX_GUESSES = 6

export type { GameMode }

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
  onBackToToday?: () => void
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
    const savedIds = loadState(sport.id, getTodayKey(), variantId)
    return savedIds.length > 0 ? restoreGuesses(sport.players, savedIds) : []
  }
  return []
}

export default function Game({ mode, sport, variantId, onBackToToday }: Props) {
  const [activeMode, setActiveMode] = useState<GameMode>(mode)
  const [answer, setAnswer] = useState<Player | null>(() =>
    mode === "daily" ? getDailyPlayer(sport) : getRandomArcadePlayer(sport),
  )
  const [dateKey] = useState<string>(getTodayKey)
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode, sport, variantId))
  const [latestIndex, setLatestIndex] = useState(-1)
  const [showPositionPopup, setShowPositionPopup] = useState(false)
  const [hideAnswer, setHideAnswer] = useState(false)
  const positionLockedShownRef = useRef(false)

  const won = !!(answer && guesses.some(g => g.id === answer.id))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const isFanatic = variantId === "fanatic"

  const guessedIds = new Set(guesses.map(g => g.id))

  const confettiColors = useMemo(() => {
    if (!answer) return []
    const teamValue = String(answer.team ?? "")
    const teamAbbrValue = String(answer.teamAbbr ?? "")
    const team = sport.teams.find(t => t.name === teamValue || t.abbr === teamAbbrValue)
    return team?.colors ?? ["#538d4e", "#b59f3b"]
  }, [answer, sport.teams])

  useWinConfetti({
    won,
    colors: confettiColors,
    dedupKey: answer ? `${sport.id}:${answer.id}:${guesses.length}` : null,
  })

  const guessablePlayers = useMemo(() => {
    const allowedPositions = new Set<string>()
    for (const p of sport.answerPool) {
      if (p.position !== undefined && p.position !== null) {
        allowedPositions.add(String(p.position))
      }
    }
    if (allowedPositions.size === 0) return sport.players
    return sport.players.filter(
      p =>
        p.position !== undefined && p.position !== null && allowedPositions.has(String(p.position)),
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

  const toastMessage = won
    ? `You got it in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}!`
    : lost
      ? "Better luck tomorrow!"
      : ""

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={toastMessage}
      onPlayAgain={handlePlayAgain}
      onBackToToday={onBackToToday}
      isArcade={activeMode === "arcade"}
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
        message={answer?.position ? `Position locked: ${String(answer.position)}` : ""}
        durationMs={2500}
      />
      {gameOver && answer && (
        <ResultBanner
          won={won}
          answer={String(answer.name)}
          guessCount={guesses.length}
          team={answer.team != null ? String(answer.team) : undefined}
          position={answer.position != null ? String(answer.position) : undefined}
          number={answer.number != null ? String(answer.number) : undefined}
          hideAnswer={hideAnswer}
          onToggleHide={() => setHideAnswer(h => !h)}
        />
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
              hideAnswer={hideAnswer}
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
