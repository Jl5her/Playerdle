import { getLeagueJourneyData } from "@playerdle/data/journeyman/leagues"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getJourneyHistory,
  getJourneyPuzzleByDateKey,
  JOURNEY_EPOCH_DATE_KEY,
  type JourneyLeague,
  type JourneyPuzzle,
  type JourneyResult,
} from "@/games/journeyman/utils/journey-daily"
import { ArchiveCalendar } from "@/shared/components"
import { useInProgressDates } from "@/shared/hooks/use-in-progress-dates"
import { formatDateKey, parseDateKey } from "@/shared/utils/calendar-date"
import { getTodayKey } from "@/shared/utils/time"

const EPOCH = parseDateKey(JOURNEY_EPOCH_DATE_KEY)

function DayDetail({
  puzzle,
  result,
  canPlay,
  onPlay,
  onViewResults,
  inProgressCount,
}: {
  puzzle: JourneyPuzzle
  result?: JourneyResult
  canPlay: boolean
  onPlay?: () => void
  onViewResults?: () => void
  inProgressCount?: number
}) {
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

interface Props {
  league: JourneyLeague
  onClose?: () => void
  onPlayArchive?: (dateKey: string) => void
  /** Bump to force a re-read of saved history (e.g. after an archive play). */
  historyVersion?: number
  /** Omit the app-viewport shell; used when hosted inside a ResultsSlidePanel. */
  panel?: boolean
}

export default function JourneyCalendar({
  league,
  onClose,
  onPlayArchive,
  historyVersion = 0,
  panel = false,
}: Props) {
  const navigate = useNavigate()
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
  const [selected, setSelected] = useState<string>(formatDateKey(today))
  const leagueData = useMemo(() => getLeagueJourneyData(league), [league])

  const history = useMemo(() => {
    const map = new Map<string, JourneyResult>()
    for (const r of getJourneyHistory(league)) map.set(r.date, r)
    return map
  }, [league, historyVersion])

  const inProgressDates = useInProgressDates(`playerdle-journey-state:v1:${league}:`, [
    historyVersion,
  ])

  const selectedPuzzle = useMemo(
    () => getJourneyPuzzleByDateKey(league, selected),
    [league, selected],
  )
  const selectedResult = history.get(selected)
  const selectedDate = useMemo(() => parseDateKey(selected), [selected])
  const selectedIsFuture = selectedDate.getTime() > today.getTime()
  const selectedIsBeforeEpoch = selectedDate.getTime() < EPOCH.getTime()

  return (
    <ArchiveCalendar
      title={`Journeyman ${leagueData.label} Archive`}
      onClose={panel ? undefined : onClose}
      onBack={panel || onClose ? undefined : () => navigate(league === "nfl" ? "/" : `/${league}`)}
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
}
