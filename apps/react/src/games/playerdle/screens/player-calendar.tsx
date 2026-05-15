import { faAngleLeft, faChevronLeft, faChevronRight, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { GuessGrid, Header } from "@/games/playerdle/components"
import { GameGuideContent } from "@/games/playerdle/modals/game-guide-content"
import Game from "@/games/playerdle/screens/game"
import {
  getSportMetaById,
  loadSportConfig,
  type Player,
  resolveSportConfig,
  type SportConfig,
  type SportId,
} from "@/games/playerdle/sports"
import { getDailyPlayer } from "@/games/playerdle/utils/daily"
import { type GameResult, getGameHistory } from "@/games/playerdle/utils/stats"
import { Overlay } from "@/shared/components"
import { formatLongDate } from "@/shared/utils/time"

const PLAYER_EPOCH = new Date(2024, 0, 1)

function getSportIdFromParam(sport?: string): SportId | null {
  if (!sport) return "nfl"
  const normalized = sport.toLowerCase()
  if (normalized === "mlb") return "mlb"
  if (normalized === "nhl") return "nhl"
  if (normalized === "nba") return "nba"
  if (normalized === "nfl") return "nfl"
  return null
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function buildMonthGrid(year: number, monthIndex: number): Array<Date | null> {
  const first = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadEmpty = first.getDay()
  const cells: Array<Date | null> = []
  for (let i = 0; i < leadEmpty; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface DayDetailProps {
  sport: SportConfig
  player: Player
  result?: GameResult
  guessedPlayers?: Player[]
  canPlay: boolean
  onPlay?: () => void
  inProgressCount?: number
}

function DayDetail({
  sport,
  player,
  result,
  guessedPlayers,
  canPlay,
  onPlay,
  inProgressCount,
}: DayDetailProps) {
  const played = !!result
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        {sport.displayName}
        {sport.activeVariantLabel ? ` · ${sport.activeVariantLabel}` : " · Daily"}
      </div>

      {played ? (
        <>
          <div className="text-xl font-black uppercase text-primary-900 dark:text-primary-50">
            {String(player.name)}
          </div>
          <div className="text-sm text-primary-500 dark:text-primary-200 mt-1 uppercase">
            {String(player.team ?? "")}
            {player.position ? ` · ${String(player.position)}` : ""}
            {player.number ? ` · #${String(player.number)}` : ""}
          </div>

          <div
            className={`mt-3 text-sm font-bold uppercase tracking-wider ${
              result.won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400"
            }`}
          >
            {result.won ? `You guessed in ${result.guesses}/6` : "You missed this one"}
          </div>

          {guessedPlayers && guessedPlayers.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <GuessGrid
                guesses={guessedPlayers}
                answer={player}
                maxGuesses={6}
                latestIndex={-1}
                columns={sport.columns}
              />
            </div>
          )}
        </>
      ) : inProgressCount !== undefined ? (
        <>
          <div className="text-base font-bold text-warning-600 dark:text-warning-400 mt-1">
            In progress · {inProgressCount}/6 guesses
          </div>
          {canPlay && onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="mt-3 w-full px-4 py-2 text-sm font-semibold rounded bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              Continue
            </button>
          )}
        </>
      ) : (
        <>
          <div className="text-base font-bold text-primary-700 dark:text-primary-200 mt-1">
            Not yet played
          </div>
          {canPlay && onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="mt-3 w-full px-4 py-2 text-sm font-semibold rounded bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              Play this day
            </button>
          )}
        </>
      )}
    </div>
  )
}

interface PlayerCalendarProps {
  variantId?: string
}

export default function PlayerCalendar({ variantId }: PlayerCalendarProps = {}) {
  const navigate = useNavigate()
  const { sport: sportParam } = useParams<{ sport?: string }>()
  const sportId = getSportIdFromParam(sportParam) ?? "nfl"
  const sportMeta = getSportMetaById(sportId)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string>(formatDateKey(today))
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const [archiveGuideOpen, setArchiveGuideOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    loadSportConfig(sportId).then(cfg => {
      if (mounted) setSport(variantId ? resolveSportConfig(cfg, variantId) : cfg)
    })
    return () => {
      mounted = false
    }
  }, [sportId, variantId])

  // archiveDateKey in deps so history re-reads localStorage when the player
  // exits an archive play session (transitions back to null).
  const history = useMemo(() => {
    const map = new Map<string, GameResult>()
    for (const r of getGameHistory(sportId, variantId)) map.set(r.date, r)
    return map
  }, [sportId, variantId, archiveDateKey])

  // Map of dateKey -> current guess count for any puzzles the player has
  // started but not finished. Scans localStorage for keys matching the
  // game's per-date storage prefix (kept in sync with game.tsx).
  const inProgressDates = useMemo(() => {
    const counts = new Map<string, number>()
    if (typeof localStorage === "undefined") return counts
    const prefix = `playerdle-state:${sportId}:${variantId ?? "classic"}:`
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(prefix)) continue
      const dateKey = k.slice(prefix.length)
      try {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const ids = Array.isArray(parsed) ? parsed : (parsed?.guessIds ?? [])
        if (Array.isArray(ids) && ids.length > 0) counts.set(dateKey, ids.length)
      } catch {
        // ignore malformed entries
      }
    }
    return counts
  }, [sportId, variantId, archiveDateKey])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view])

  const selectedDate = useMemo(() => {
    const [y, m, d] = selected.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [selected])

  const selectedPlayer = useMemo(() => {
    if (!sport) return null
    try {
      return getDailyPlayer(sport, selectedDate)
    } catch {
      return null
    }
  }, [sport, selectedDate])

  function goPrevMonth() {
    setView(v => {
      const m = v.month - 1
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m }
    })
  }
  function goNextMonth() {
    setView(v => {
      const m = v.month + 1
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m }
    })
  }

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  const isAtCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth()

  const menuPath = sportId === "nfl" ? "/" : `/${sportId}`

  if (archiveDateKey && sport) {
    const [ay, am, ad] = archiveDateKey.split("-").map(Number)
    const archiveSubtitle = formatLongDate(new Date(ay, am - 1, ad))
    return (
      <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
        <Header
          sport={sportMeta}
          subtitle={archiveSubtitle}
          onBack={() => setArchiveDateKey(null)}
          onShowTutorial={archiveGuideOpen ? undefined : () => setArchiveGuideOpen(true)}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden relative pt-[3.75rem]">
          <div
            className={clsx(
              "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
              archiveGuideOpen ? "crossfade-inactive" : "crossfade-active",
            )}
          >
            <Game
              key={`archive:${sport.id}:${archiveDateKey}`}
              mode="daily"
              sport={sport}
              variantId={variantId}
              archiveDateKey={archiveDateKey}
            />
          </div>
          <Overlay
            open={archiveGuideOpen}
            onClose={() => setArchiveGuideOpen(false)}
            className="px-4 pb-4 overflow-hidden flex min-h-0"
          >
            <div className="w-full max-w-2xl mx-auto h-full min-h-0 flex flex-col">
              <div className="flex items-center justify-between pt-3">
                <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                  How to Play
                </h2>
                <button
                  type="button"
                  className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                  aria-label="Close guide"
                  onClick={() => setArchiveGuideOpen(false)}
                >
                  <FontAwesomeIcon
                    icon={faXmark}
                    className="text-2xl"
                  />
                </button>
              </div>
              <GameGuideContent
                sport={sport}
                mode="manual"
                className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              />
            </div>
          </Overlay>
        </div>
      </div>
    )
  }

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="game-header bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center border-b-2 border-primary-300 dark:border-primary-700">
        <button
          onClick={() => navigate(menuPath)}
          aria-label="Back to menu"
          title="Back"
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary-900 dark:text-primary-50 bg-transparent rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-colors"
        >
          <FontAwesomeIcon
            icon={faAngleLeft}
            className="text-[1.7rem]"
            aria-hidden="true"
          />
        </button>
        <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
          {sportMeta.displayName} Archive
        </h1>
        <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">
          Past daily puzzles
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[3.75rem]">
        <div className="max-w-md mx-auto px-3 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
              aria-label="Previous month"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="text-base font-bold uppercase tracking-wider text-primary-900 dark:text-primary-50">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              disabled={isAtCurrentMonth}
              className={clsx(
                "w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors",
                isAtCurrentMonth
                  ? "text-primary-300/50 dark:text-primary-700/50 cursor-not-allowed"
                  : "text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80",
              )}
              aria-label="Next month"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200 text-center mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={`${d}-${i}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} />
              const key = formatDateKey(cell)
              const isFuture = cell.getTime() > today.getTime()
              const isBeforeEpoch = cell.getTime() < PLAYER_EPOCH.getTime()
              const disabled = isFuture || isBeforeEpoch
              const isSelected = key === selected
              const isToday = key === formatDateKey(today)
              const result = history.get(key)
              const inProgressCount = !result && !disabled ? inProgressDates.get(key) : undefined
              let cellPosition: string | undefined
              if (!disabled && sport && result) {
                try {
                  const p = getDailyPlayer(sport, cell)
                  cellPosition = p.position ? String(p.position) : undefined
                } catch {}
              }
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(key)}
                  className={clsx(
                    "relative overflow-hidden aspect-square rounded-md text-sm font-semibold inline-flex flex-col items-center justify-center gap-0.5 transition-colors",
                    disabled
                      ? "text-primary-300/50 dark:text-primary-700/50 cursor-not-allowed"
                      : isSelected
                        ? "bg-primary-700 text-primary-50 dark:bg-primary-200 dark:text-primary-900"
                        : isToday
                          ? "border-2 border-primary-700/40 dark:border-primary-200/40 text-primary-900 dark:text-primary-50"
                          : "text-primary-900 dark:text-primary-50 hover:bg-primary-200/60 dark:hover:bg-primary-700/60",
                  )}
                >
                  {cellPosition && (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "absolute inset-0 flex items-center justify-center font-black tracking-tight pointer-events-none select-none",
                        cellPosition.length > 2 ? "text-base" : "text-xl",
                        isSelected
                          ? "text-primary-200 dark:text-primary-700"
                          : "text-primary-300 dark:text-primary-700",
                      )}
                    >
                      {cellPosition}
                    </span>
                  )}
                  <span className="relative z-10">{cell.getDate()}</span>
                  {result && !disabled && (
                    <span
                      className={clsx(
                        "relative z-10 min-w-[1rem] px-1 text-[10px] leading-4 font-black rounded",
                        result.won
                          ? "bg-success-500/90 text-primary-50 dark:bg-success-400 dark:text-primary-900"
                          : "bg-error-500/90 text-primary-50 dark:bg-error-400 dark:text-primary-900",
                      )}
                      aria-label={result.won ? `Won in ${result.guesses}` : "Lost"}
                    >
                      {result.won ? result.guesses : "X"}
                    </span>
                  )}
                  {inProgressCount !== undefined && (
                    <span
                      className="relative z-10 min-w-[1rem] px-1 text-[10px] leading-4 font-black rounded bg-warning-500/90 text-primary-50 dark:bg-warning-600 dark:text-primary-900"
                      aria-label={`In progress, ${inProgressCount} guesses`}
                    >
                      {inProgressCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {sport && selectedPlayer && (() => {
            const selectedResult = history.get(selected)
            const guessedPlayers = selectedResult?.guessIds
              ? selectedResult.guessIds
                  .map((id: string) => sport.players.find((p: Player) => p.id === id))
                  .filter((p: Player | undefined): p is Player => p !== undefined)
              : undefined
            const selectedIsFuture = selectedDate.getTime() > today.getTime()
            const selectedIsBeforeEpoch = selectedDate.getTime() < PLAYER_EPOCH.getTime()
            return (
              <DayDetail
                sport={sport}
                player={selectedPlayer}
                result={selectedResult}
                guessedPlayers={guessedPlayers}
                canPlay={!selectedIsFuture && !selectedIsBeforeEpoch}
                onPlay={() => setArchiveDateKey(selected)}
                inProgressCount={selectedResult ? undefined : inProgressDates.get(selected)}
              />
            )
          })()}
          {!sport && (
            <div className="mt-4 text-center text-sm text-primary-500 dark:text-primary-200">
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
