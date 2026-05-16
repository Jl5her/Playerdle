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
import { ArchiveCalendar, Panel } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"
import { useInProgressDates } from "@/shared/hooks/use-in-progress-dates"
import { formatDateKey, parseDateKey } from "@/shared/utils/calendar-date"
import { getTodayKey } from "@/shared/utils/time"

const EPOCH = parseDateKey(COLORS_EPOCH_DATE_KEY)

interface DayDetailProps {
  puzzle: ColorsPuzzle
  result?: ColorsResult
  canPlay: boolean
  onPlay?: () => void
  onViewResults?: () => void
  inProgressCount?: number
}

function DayDetail({
  puzzle,
  result,
  canPlay,
  onPlay,
  onViewResults,
  inProgressCount,
}: DayDetailProps) {
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        #{puzzle.index} · {puzzle.dateKey}
      </div>

      {result ? (
        <>
          <div
            className={clsx(
              "mt-1 text-base font-bold uppercase tracking-wider",
              result.won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400",
            )}
          >
            {result.won ? `Solved in ${result.guesses}/5` : "Missed it"}
          </div>
          {onViewResults && (
            <button
              type="button"
              onClick={onViewResults}
              className="mt-3 w-full px-4 py-2 text-sm font-semibold rounded bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              See Results
            </button>
          )}
        </>
      ) : inProgressCount !== undefined ? (
        <>
          <div className="text-base font-bold text-warning-600 dark:text-warning-400 mt-1">
            In progress · {inProgressCount}/5 guesses
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

interface ColorsCalendarProps {
  onClose?: () => void
  variant?: ColorsVariant
  onPlayArchive?: (dateKey: string) => void
  /** Bump to force a re-read of saved history (e.g. after an archive play). */
  historyVersion?: number
  /** Omit the app-viewport shell; renders as panel content driven by context. */
  panel?: boolean
  /** Panel ID in context; required when panel=true. */
  id?: string
}

export default function ColorsCalendar({
  onClose,
  variant = "pro",
  onPlayArchive,
  historyVersion = 0,
  panel = false,
  id,
}: ColorsCalendarProps = {}) {
  const ctx = usePanelContext()
  const navigate = useNavigate()
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
  const [selected, setSelected] = useState<string>(formatDateKey(today))

  const history = useMemo(() => {
    const map = new Map<string, ColorsResult>()
    for (const r of getColorsHistory(variant)) map.set(r.date, r)
    return map
  }, [variant, historyVersion])

  const inProgressDates = useInProgressDates(
    `${variant === "collegiate" ? "playerdle-colors-collegiate-state:v1" : "playerdle-colors-state:v1"}:`,
    [historyVersion],
  )

  const selectedPuzzle = useMemo(
    () => getColorsPuzzleByDateKey(selected, variant),
    [selected, variant],
  )
  const selectedResult = history.get(selected)
  const selectedDate = useMemo(() => parseDateKey(selected), [selected])
  const selectedIsFuture = selectedDate.getTime() > today.getTime()
  const selectedIsBeforeEpoch = selectedDate.getTime() < EPOCH.getTime()

  const calendarTitle = variant === "collegiate" ? "Collegiate Archive" : "Statehue Archive"

  const calendar = (
    <ArchiveCalendar
      title={calendarTitle}
      onClose={panel ? undefined : onClose}
      onBack={panel || onClose ? undefined : () => navigate("/statehue")}
      panel={panel}
      epoch={EPOCH}
      history={history}
      inProgress={inProgressDates}
      selected={selected}
      onSelect={setSelected}
    >
      <DayDetail
        puzzle={selectedPuzzle}
        result={selectedResult}
        canPlay={!selectedIsFuture && !selectedIsBeforeEpoch}
        onPlay={onPlayArchive ? () => onPlayArchive(selected) : undefined}
        onViewResults={onPlayArchive ? () => onPlayArchive(selected) : undefined}
        inProgressCount={selectedResult ? undefined : inProgressDates.get(selected)}
      />
    </ArchiveCalendar>
  )

  if (panel && ctx && id) {
    return (
      <Panel open={ctx.isOpen(id)} onClose={ctx.pop} title={calendarTitle} layout="full">
        {calendar}
      </Panel>
    )
  }

  return calendar
}
