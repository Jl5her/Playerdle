import clsx from "clsx"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getCollegeFieldHistory,
  getCollegeFieldPuzzleByDateKey,
  COLLEGEFIELD_EPOCH,
  type CollegeFieldPuzzle,
  type CollegeFieldResult,
} from "@/games/collegefield/utils/collegefield-daily"
import { ArchiveCalendar, Panel } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"
import { useInProgressDates } from "@/shared/hooks/use-in-progress-dates"
import { formatDateKey, parseDateKey } from "@/shared/utils/calendar-date"
import { getTodayKey } from "@/shared/utils/time"

const EPOCH = parseDateKey(COLLEGEFIELD_EPOCH)

function DayDetail({
  puzzle,
  result,
  canPlay,
  onPlay,
  inProgressCount,
}: {
  puzzle: CollegeFieldPuzzle
  result?: CollegeFieldResult
  canPlay: boolean
  onPlay?: () => void
  inProgressCount?: number
}) {
  const buttonClass =
    "mt-3 w-full px-4 py-2 text-sm font-semibold rounded bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 hover:opacity-90 transition-opacity uppercase tracking-wider"

  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        {puzzle.dateKey}
      </div>
      <div className="text-sm font-semibold text-primary-700 dark:text-primary-200 mt-1">
        {puzzle.team.name}
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
          {canPlay && onPlay && (
            <button type="button" onClick={onPlay} className={buttonClass}>
              Replay
            </button>
          )}
        </>
      ) : inProgressCount !== undefined ? (
        <>
          <div className="text-base font-bold text-warning-600 dark:text-warning-400 mt-1">
            In progress · {inProgressCount}/5 guesses
          </div>
          {canPlay && onPlay && (
            <button type="button" onClick={onPlay} className={buttonClass}>
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
            <button type="button" onClick={onPlay} className={buttonClass}>
              Play this day
            </button>
          )}
        </>
      )}
    </div>
  )
}

interface Props {
  panel?: boolean
  id?: string
  historyVersion?: number
}

export default function CollegeFieldCalendar({ panel = false, id, historyVersion = 0 }: Props) {
  const ctx = usePanelContext()
  const navigate = useNavigate()
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
  const todayKey = useMemo(() => formatDateKey(today), [today])
  const [selected, setSelected] = useState<string>(todayKey)

  const history = useMemo(() => {
    const map = new Map<string, CollegeFieldResult>()
    for (const r of getCollegeFieldHistory()) map.set(r.date, r)
    return map
  }, [historyVersion])

  const inProgressDates = useInProgressDates("playerdle-collegefield-state:nfl:", [historyVersion])

  const selectedPuzzle = useMemo(() => getCollegeFieldPuzzleByDateKey(selected), [selected])
  const selectedResult = history.get(selected)
  const selectedDate = useMemo(() => parseDateKey(selected), [selected])
  const selectedIsFuture = selectedDate.getTime() > today.getTime()
  const selectedIsBeforeEpoch = selectedDate.getTime() < EPOCH.getTime()
  const canPlay = !selectedIsFuture && !selectedIsBeforeEpoch

  function handlePlay() {
    if (selected === todayKey) {
      navigate("/collegefield")
    } else {
      navigate(`/collegefield/archive/${selected}`)
    }
  }

  const calendar = (
    <ArchiveCalendar
      title="CollegeField Archive"
      onBack={panel ? undefined : () => navigate("/collegefield")}
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
        canPlay={canPlay}
        onPlay={canPlay ? handlePlay : undefined}
        inProgressCount={selectedResult ? undefined : inProgressDates.get(selected)}
      />
    </ArchiveCalendar>
  )

  if (panel && ctx && id) {
    return (
      <Panel open={ctx.isOpen(id)} onClose={ctx.pop} title="CollegeField Archive" layout="full">
        {calendar}
      </Panel>
    )
  }

  return calendar
}
