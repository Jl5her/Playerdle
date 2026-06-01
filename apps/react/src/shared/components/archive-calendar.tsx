import {
  faAngleLeft,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { type ReactNode, useMemo, useRef, useState } from "react"
import ScrollHint from "@/shared/components/scroll-hint"
import { buildMonthGrid, formatDateKey, parseDateKey } from "@/shared/utils/calendar-date"
import { getTodayKey } from "@/shared/utils/time"

interface CalendarResult {
  won: boolean
  guesses: number
}

interface CellDecorationArgs {
  dateKey: string
  isSelected: boolean
}

interface Props<R extends CalendarResult> {
  /** Title displayed in the header (e.g. "Statehue Archive"). */
  title: string
  /** Sub-text under the title; defaults to "Past daily puzzles". */
  subtitle?: string
  /** Back-arrow handler. Used when the calendar is a standalone route screen. */
  onBack?: () => void
  /** Close-X handler. Used when the calendar is shown inside an overlay. Takes
   *  precedence over `onBack` for the icon. */
  onClose?: () => void
  /** When true, omits the app-viewport wrapper and game-header so the calendar
   *  can be hosted inside a ResultsSlidePanel. */
  panel?: boolean
  /** Earliest date the user can navigate to / play. Cells before this are disabled. */
  epoch: Date
  /** Per-date results keyed by `YYYY-MM-DD`. */
  history: Map<string, R>
  /** Per-date current-guess counts for saved-but-unfinished puzzles. */
  inProgress: Map<string, number>
  /** Currently selected date key. */
  selected: string
  /** Notifies the parent when the user picks a different cell. */
  onSelect: (dateKey: string) => void
  /** Optional decorative content rendered behind the date number on cells the
   *  player has actually completed (revealing it earlier would spoil the puzzle). */
  renderCellDecoration?: (args: CellDecorationArgs) => ReactNode
  /** Day-detail panel rendered below the grid (game-specific). */
  children?: ReactNode
}

export default function ArchiveCalendar<R extends CalendarResult>({
  title,
  subtitle = "Past daily puzzles",
  onBack,
  onClose,
  panel = false,
  epoch,
  history,
  inProgress,
  selected,
  onSelect,
  renderCellDecoration,
  children,
}: Props<R>) {
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const scrollRef = useRef<HTMLDivElement>(null)

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view])
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  const isAtCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth()

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

  const content = (
    <>
      <div
        ref={scrollRef}
        className={clsx(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
          !panel && "pt-[3.75rem]",
        )}
      >
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
              if (!cell) return <div key={`empty-${i}`} />
              const key = formatDateKey(cell)
              const isFuture = cell.getTime() > today.getTime()
              const isBeforeEpoch = cell.getTime() < epoch.getTime()
              const disabled = isFuture || isBeforeEpoch
              const isSelected = key === selected
              const isToday = key === formatDateKey(today)
              const result = history.get(key)
              const inProgressCount = !result && !disabled ? inProgress.get(key) : undefined
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(key)}
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
                  {result && !disabled && renderCellDecoration?.({ dateKey: key, isSelected })}
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

          {children}
        </div>
      </div>
      <ScrollHint scrollRef={scrollRef} />
    </>
  )

  if (panel) return content

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="game-header bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center border-b-2 border-primary-300 dark:border-primary-700">
        {onBack && (
          <button
            onClick={onBack}
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
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            title="Close (Esc)"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="text-2xl"
              aria-hidden="true"
            />
          </button>
        )}
        <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
          {title}
        </h1>
        <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">{subtitle}</p>
      </header>
      {content}
    </div>
  )
}
