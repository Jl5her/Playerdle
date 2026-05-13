import {
  faAngleLeft,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
}

function DayDetail({ sport, player, result }: DayDetailProps) {
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        {sport.displayName}
        {sport.activeVariantLabel ? ` · ${sport.activeVariantLabel}` : " · Daily"}
      </div>
      <div className="text-xl font-black uppercase text-primary-900 dark:text-primary-50">
        {String(player.name)}
      </div>
      <div className="text-sm text-primary-500 dark:text-primary-200 mt-1 uppercase">
        {String(player.team ?? "")}
        {player.position ? ` · ${String(player.position)}` : ""}
        {player.number ? ` · #${String(player.number)}` : ""}
      </div>

      {result && (
        <div
          className={`mt-3 text-sm font-bold uppercase tracking-wider ${
            result.won
              ? "text-success-500 dark:text-success-400"
              : "text-error-500 dark:text-error-400"
          }`}
        >
          {result.won ? `You guessed in ${result.guesses}/6` : "You missed this one"}
        </div>
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

  useEffect(() => {
    let mounted = true
    loadSportConfig(sportId).then(cfg => {
      if (mounted) setSport(variantId ? resolveSportConfig(cfg, variantId) : cfg)
    })
    return () => {
      mounted = false
    }
  }, [sportId, variantId])

  const history = useMemo(() => {
    const map = new Map<string, GameResult>()
    for (const r of getGameHistory(sportId, variantId)) map.set(r.date, r)
    return map
  }, [sportId, variantId])

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

  const menuPath = sportId === "nfl" ? "/" : `/${sportId}`

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
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

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
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
              let cellPosition: string | undefined
              if (!disabled && sport) {
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
                  className={`relative overflow-hidden aspect-square rounded-md text-sm font-semibold inline-flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    disabled
                      ? "text-primary-300/50 dark:text-primary-700/50 cursor-not-allowed"
                      : isSelected
                        ? "bg-primary-700 text-primary-50 dark:bg-primary-200 dark:text-primary-900"
                        : isToday
                          ? "border-2 border-primary-700/40 dark:border-primary-200/40 text-primary-900 dark:text-primary-50"
                          : "text-primary-900 dark:text-primary-50 hover:bg-primary-200/60 dark:hover:bg-primary-700/60"
                  }`}
                >
                  {cellPosition && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 flex items-center justify-center font-black tracking-tight pointer-events-none select-none ${
                        cellPosition.length > 2 ? "text-base" : "text-xl"
                      } ${
                        isSelected
                          ? "text-primary-200 dark:text-primary-700"
                          : "text-primary-300 dark:text-primary-700"
                      }`}
                    >
                      {cellPosition}
                    </span>
                  )}
                  <span className="relative z-10">{cell.getDate()}</span>
                  {result && !disabled && (
                    <span
                      className={`relative z-10 w-1.5 h-1.5 rounded-full ${
                        result.won
                          ? "bg-success-500 dark:bg-success-400"
                          : "bg-error-500 dark:bg-error-400"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {sport && selectedPlayer && (
            <DayDetail
              sport={sport}
              player={selectedPlayer}
              result={history.get(selected)}
            />
          )}
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
