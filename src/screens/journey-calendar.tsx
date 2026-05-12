import {
  faAngleLeft,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getJourneyHistory,
  getJourneyPuzzleByDateKey,
  JOURNEY_EPOCH_DATE_KEY,
  type JourneyPuzzle,
  type JourneyResult,
} from "@/utils/journey-daily"
import { getTodayKeyInEasternTime } from "@/utils/daily"

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

const EPOCH = parseDateKey(JOURNEY_EPOCH_DATE_KEY)

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

function DayDetail({ puzzle, result }: { puzzle: JourneyPuzzle; result?: JourneyResult }) {
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        #{puzzle.index} · {puzzle.dateKey}
      </div>
      <div className="text-xl font-black uppercase text-primary-900 dark:text-primary-50">
        {puzzle.player.name}
      </div>
      <div className="text-xs text-primary-500 dark:text-primary-200 uppercase tracking-wider mt-1">
        {puzzle.player.position} · {puzzle.player.college}
      </div>

      <ol className="mt-3 space-y-1 text-xs">
        {puzzle.player.teams.map((team, i) => (
          <li
            key={`${team}-${i}`}
            className="flex items-center gap-2 text-primary-900 dark:text-primary-50"
          >
            <span className="w-5 text-right text-primary-500 dark:text-primary-200">
              {i + 1}.
            </span>
            <span>{team}</span>
            {i === puzzle.player.teams.length - 1 && (
              <span className="ml-1 px-1 rounded text-[9px] tracking-wider font-bold border border-current opacity-60">
                CURRENT
              </span>
            )}
          </li>
        ))}
      </ol>

      {result && (
        <div
          className={`mt-3 text-sm font-bold uppercase tracking-wider ${
            result.won
              ? "text-success-500 dark:text-success-400"
              : "text-error-500 dark:text-error-400"
          }`}
        >
          {result.won ? `You guessed in ${result.guesses}/5` : "You missed this one"}
        </div>
      )}
    </div>
  )
}

interface Props {
  onClose?: () => void
}

export default function JourneyCalendar({ onClose }: Props = {}) {
  const navigate = useNavigate()
  const today = parseDateKey(getTodayKeyInEasternTime())
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string>(formatDateKey(today))

  const history = useMemo(() => {
    const map = new Map<string, JourneyResult>()
    for (const r of getJourneyHistory()) map.set(r.date, r)
    return map
  }, [])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view])
  const selectedPuzzle = useMemo(() => getJourneyPuzzleByDateKey(selected), [selected])
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
          onClick={() => (onClose ? onClose() : navigate("/colors"))}
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
          Journey Archive
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
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(key)}
                  className={`aspect-square rounded-md text-sm font-semibold inline-flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    disabled
                      ? "text-primary-300/50 dark:text-primary-700/50 cursor-not-allowed"
                      : isSelected
                        ? "bg-primary-700 text-primary-50 dark:bg-primary-200 dark:text-primary-900"
                        : isToday
                          ? "border-2 border-primary-700/40 dark:border-primary-200/40 text-primary-900 dark:text-primary-50"
                          : "text-primary-900 dark:text-primary-50 hover:bg-primary-200/60 dark:hover:bg-primary-700/60"
                  }`}
                >
                  <span>{cell.getDate()}</span>
                  {result && !disabled && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
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

          <DayDetail
            puzzle={selectedPuzzle}
            result={selectedResult}
          />
        </div>
      </div>
    </div>
  )
}
