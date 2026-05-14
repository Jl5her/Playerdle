import {
  faAngleLeft,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getStateByName } from "@playerdle/data/statehue/all-states"
import { STATE_PATHS } from "@playerdle/data/statehue/state-paths"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  COLORS_EPOCH_DATE_KEY,
  type ColorsPuzzle,
  type ColorsResult,
  type ColorsVariant,
  getColorsHistory,
  getColorsPuzzleByDateKey,
} from "@/games/statehue/utils/colors-daily"
import { getTodayKey } from "@/shared/utils/time"

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))))
  const toHex = (c: number) => c.toString(16).padStart(2, "0")
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`
}

function diamondBorder(hex: string): string {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return shadeHex(hex, -0.25)
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2
  return shadeHex(hex, l < 0.18 ? 0.5 : -0.25)
}

function Diamond({ color, size = 5 }: { color: string; size?: number }) {
  const border = diamondBorder(color)
  const dim = `${size * 0.25}rem`
  return (
    <span
      className="inline-block rotate-45 rounded-xs"
      style={{
        width: dim,
        height: dim,
        backgroundColor: color,
        border: `1px solid ${border}`,
      }}
    />
  )
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const EPOCH = parseDateKey(COLORS_EPOCH_DATE_KEY)

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
  puzzle: ColorsPuzzle
  result?: ColorsResult
}

function DayDetail({ puzzle, result }: DayDetailProps) {
  const shape = STATE_PATHS[puzzle.state.id]
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
            #{puzzle.index} · {puzzle.dateKey}
          </div>
          <div className="text-xl font-black uppercase text-primary-900 dark:text-primary-50">
            {puzzle.state.name}
          </div>
        </div>
        {shape && (
          <svg
            viewBox={shape.viewBox}
            className="w-10 h-10 text-primary-700 dark:text-primary-200"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={shape.d} />
          </svg>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {puzzle.teams.map((team, i) => (
          <div
            key={`${team.name}-${i}`}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-2 shrink-0">
              {team.colors.map((color, j) => (
                <Diamond
                  key={`${color}-${j}`}
                  color={color}
                />
              ))}
            </div>
            <div className="text-xs">
              <div className="text-primary-500 dark:text-primary-200 uppercase tracking-wider font-bold">
                {team.league}
              </div>
              <div className="text-primary-900 dark:text-primary-50 font-semibold">{team.name}</div>
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div
          className={clsx(
            "mt-3 text-sm font-bold uppercase tracking-wider",
            result.won
              ? "text-success-500 dark:text-success-400"
              : "text-error-500 dark:text-error-400",
          )}
        >
          {result.won ? `You guessed in ${result.guesses}/5` : "You missed this one"}
        </div>
      )}

      {result?.guessIds && result.guessIds.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {result.guessIds.map((name, i) => {
            const isCorrect = name.toLowerCase() === puzzle.state.name.toLowerCase()
            const code = getStateByName(name)?.id
            const stateShape = code ? STATE_PATHS[code] : undefined
            return (
              <div
                key={i}
                className={clsx(
                  "flex items-center gap-2 px-2 py-1 rounded border text-xs font-semibold uppercase tracking-wider",
                  isCorrect
                    ? "bg-success-500/20 border-success-500/60 text-success-500 dark:text-success-400"
                    : "bg-error-500/20 border-error-500/60 text-error-500 dark:text-error-400",
                )}
              >
                {stateShape ? (
                  <svg
                    viewBox={stateShape.viewBox}
                    className="w-4 h-4 shrink-0"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={stateShape.d} />
                  </svg>
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <span>{name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ColorsCalendarProps {
  onClose?: () => void
  variant?: ColorsVariant
}

export default function ColorsCalendar({
  onClose,
  variant = "pro",
}: ColorsCalendarProps = {}) {
  const navigate = useNavigate()
  const today = parseDateKey(getTodayKey())
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string>(formatDateKey(today))

  const history = useMemo(() => {
    const map = new Map<string, ColorsResult>()
    for (const r of getColorsHistory(variant)) map.set(r.date, r)
    return map
  }, [variant])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view])
  const selectedPuzzle = useMemo(
    () => getColorsPuzzleByDateKey(selected, variant),
    [selected, variant],
  )
  const selectedResult = history.get(selected)

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

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
        <button
          onClick={() => (onClose ? onClose() : navigate("/statehue"))}
          aria-label={onClose ? "Close calendar" : "Back to menu"}
          title={onClose ? "Close" : "Back"}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary-900 dark:text-primary-50 bg-transparent rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-colors"
        >
          <FontAwesomeIcon
            icon={onClose ? faXmark : faAngleLeft}
            className="text-[1.7rem]"
            aria-hidden="true"
          />
        </button>
        <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
          Statehue Archive
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
              const isBeforeEpoch = cell.getTime() < EPOCH.getTime()
              const disabled = isFuture || isBeforeEpoch
              const isSelected = key === selected
              const isToday = key === formatDateKey(today)
              const result = history.get(key)
              const cellPuzzle = !disabled ? getColorsPuzzleByDateKey(key, variant) : null
              const cellShape = cellPuzzle ? STATE_PATHS[cellPuzzle.state.id] : undefined
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
                  {cellShape && (
                    <svg
                      viewBox={cellShape.viewBox}
                      className={clsx(
                        "absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] opacity-50 pointer-events-none",
                        isSelected
                          ? "text-primary-200 dark:text-primary-700"
                          : "text-primary-600 dark:text-primary-300",
                      )}
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={cellShape.d} />
                    </svg>
                  )}
                  <span className="relative z-10">{cell.getDate()}</span>
                  {result && !disabled && (
                    <span
                      className={clsx(
                        "relative z-10 w-1.5 h-1.5 rounded-full",
                        result.won
                          ? "bg-success-500 dark:bg-success-400"
                          : "bg-error-500 dark:bg-error-400",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <DayDetail
            puzzle={selectedPuzzle}
            result={selectedResult}
          />
        </div>
      </div>
    </div>
  )
}
