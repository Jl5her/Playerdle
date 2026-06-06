import type { GameMode } from "@playerdle/types"
import clsx from "clsx"
import { useMemo, useRef, useState } from "react"
import { useGameAnalytics } from "@/shared/hooks/use-game-analytics"
import { GuessGrid, GuessInput } from "@/games/playerdle/components"
import { StatsContent } from "@/games/playerdle/modals/stats-content"
import type { Player, SportConfig } from "@/games/playerdle/sports"
import { getDailyPlayer, getRandomArcadePlayer, getTodayKey } from "@/games/playerdle/utils/daily"
import { saveGameResult } from "@/games/playerdle/utils/stats"
import { DailyGameShell, Popup, ResultBanner, ScrollHint } from "@/shared/components"
import { useWinConfetti } from "@/shared/hooks/use-win-confetti"
import { parseDateKey } from "@/shared/utils/calendar-date"

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
  /**
   * When set, plays the daily puzzle for this past date. Result is saved with
   * an archive flag so it doesn't count toward streaks.
   */
  archiveDateKey?: string
}

function getStorageKey(sportId: string, dateKey: string, variantId?: string): string {
  return `playerdle-state:${sportId}:${variantId ?? "classic"}:${dateKey}`
}

function loadState(sportId: string, dateKey: string, variantId?: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sportId, dateKey, variantId))
    if (!raw) return []
    // Per-date storage stores the array directly. Older versions wrapped
    // it in { dateKey, guessIds } — accept either shape so in-flight games
    // from before this layout change keep working.
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed?.guessIds) ? parsed.guessIds : []
  } catch {
    return []
  }
}

function saveState(sportId: string, dateKey: string, guessIds: string[], variantId?: string) {
  localStorage.setItem(getStorageKey(sportId, dateKey, variantId), JSON.stringify(guessIds))
}

function restoreGuesses(players: Player[], ids: string[]): Player[] {
  const byId = new Map(players.map(player => [player.id, player]))
  return ids.map(id => byId.get(id)).filter(Boolean) as Player[]
}

function getInitialGuesses(
  mode: GameMode,
  sport: SportConfig,
  variantId: string | undefined,
  archiveDateKey: string | undefined,
): Player[] {
  if (mode === "daily") {
    const dateKey = archiveDateKey ?? getTodayKey()
    const savedIds = loadState(sport.id, dateKey, variantId)
    return savedIds.length > 0 ? restoreGuesses(sport.players, savedIds) : []
  }
  return []
}

function PositionBadge({ position, revealed }: { position: string; revealed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-primary-400 dark:text-primary-500">
        Position
      </span>
      <span
        className={clsx(
          "relative inline-block w-12 h-12 rotate-45 rounded-md border-2 transition-colors duration-500",
          revealed
            ? "border-success-500 bg-success-500/20"
            : "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900",
        )}
      >
        <span
          className={clsx(
            "absolute inset-0 -rotate-45 flex items-center justify-center text-sm font-black tracking-wider transition-colors duration-500",
            revealed
              ? "text-success-500 dark:text-success-400"
              : "text-primary-300 dark:text-primary-600",
          )}
        >
          {position}
        </span>
      </span>
    </div>
  )
}

export default function Game({ mode, sport, variantId, onBackToToday, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<GameMode>(mode)
  const [answer, setAnswer] = useState<Player | null>(() => {
    if (mode === "daily") {
      return getDailyPlayer(sport, archiveDateKey ? parseDateKey(archiveDateKey) : undefined)
    }
    return getRandomArcadePlayer(sport)
  })
  const [dateKey] = useState<string>(() => archiveDateKey ?? getTodayKey())
  const [guesses, setGuesses] = useState<Player[]>(() =>
    getInitialGuesses(mode, sport, variantId, archiveDateKey),
  )
  const [latestIndex, setLatestIndex] = useState(-1)
  const [showPositionPopup, setShowPositionPopup] = useState(false)
  const [hideAnswer, setHideAnswer] = useState(false)
  const positionLockedShownRef = useRef(false)

  const won = !!(answer && guesses.some(g => g.id === answer.id))
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const isRatingsMode =
    variantId === "fanatic" || variantId === "madden" || variantId === "nba2k"

  const positionRevealed = useMemo(() => {
    if (!isRatingsMode) return false
    if (gameOver) return true
    if (!answer) return false
    return guesses.some(g => g.position !== undefined && g.position === answer.position)
  }, [isRatingsMode, gameOver, answer, guesses])

  const analytics = useGameAnalytics({
    game: "playerdle",
    sport: sport.id,
    variant: variantId ?? "classic",
    mode: activeMode,
    maxGuesses: MAX_GUESSES,
    dateKey,
    isArchive: !!archiveDateKey,
    initialGuessCount: guesses.length,
    initialGameOver: gameOver,
  })

  const guessedIds = useMemo(() => new Set(guesses.map(g => g.id)), [guesses])

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

    analytics.onGuess(newGuesses.length, newWon)

    if (
      isRatingsMode &&
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
        saveGameResult(
          sport.id,
          newWon,
          newGuesses.length,
          variantId,
          newGuesses.map(g => g.id),
          dateKey,
        )
      }
      analytics.onComplete(newWon, newGuesses.length)
    }
  }

  function handlePlayAgain() {
    analytics.reset()
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
          {isRatingsMode && (
            <div className="flex justify-center py-3">
              <PositionBadge
                position={positionRevealed ? String(answer.position ?? "?") : "?"}
                revealed={positionRevealed}
              />
            </div>
          )}
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
