import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Header } from "@/games/playerdle/components"
import { GameGuideContent } from "@/games/playerdle/modals/game-guide-content"
import Game from "@/games/playerdle/screens/game"
import {
  getSportMetaById,
  loadSportConfig,
  resolveSportConfig,
  type SportConfig,
  type SportId,
} from "@/games/playerdle/sports"
import { type GameResult, getGameHistory } from "@/games/playerdle/utils/stats"
import { ArchiveCalendar, Overlay } from "@/shared/components"
import { useInProgressDates } from "@/shared/hooks/use-in-progress-dates"
import { formatDateKey, parseDateKey } from "@/shared/utils/calendar-date"
import { formatLongDate, getTodayKey } from "@/shared/utils/time"

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

interface DayDetailProps {
  sport: SportConfig
  result?: GameResult
  canPlay: boolean
  onPlay?: () => void
  onViewResults?: () => void
  inProgressCount?: number
}

function DayDetail({
  sport,
  result,
  canPlay,
  onPlay,
  onViewResults,
  inProgressCount,
}: DayDetailProps) {
  return (
    <div className="mt-4 rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 p-4">
      <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200">
        {sport.displayName}
        {sport.activeVariantLabel ? ` · ${sport.activeVariantLabel}` : " · Daily"}
      </div>

      {result ? (
        <>
          <div
            className={`mt-1 text-base font-bold uppercase tracking-wider ${
              result.won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400"
            }`}
          >
            {result.won ? `Solved in ${result.guesses}/6` : "Missed it"}
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
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
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

  const inProgressDates = useInProgressDates(
    `playerdle-state:${sportId}:${variantId ?? "classic"}:`,
    [archiveDateKey],
  )

  const selectedDate = useMemo(() => parseDateKey(selected), [selected])

  const menuPath = sportId === "nfl" ? "/" : `/${sportId}`

  if (archiveDateKey && sport) {
    const archiveSubtitle = formatLongDate(parseDateKey(archiveDateKey))
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

  const selectedResult = history.get(selected)
  const selectedIsFuture = selectedDate.getTime() > today.getTime()
  const selectedIsBeforeEpoch = selectedDate.getTime() < PLAYER_EPOCH.getTime()

  return (
    <ArchiveCalendar
      title={`${sportMeta.displayName} Archive`}
      onBack={() => navigate(menuPath)}
      epoch={PLAYER_EPOCH}
      history={history}
      inProgress={inProgressDates}
      selected={selected}
      onSelect={setSelected}
    >
      {sport ? (
        <DayDetail
          sport={sport}
          result={selectedResult}
          canPlay={!selectedIsFuture && !selectedIsBeforeEpoch}
          onPlay={() => setArchiveDateKey(selected)}
          onViewResults={() => setArchiveDateKey(selected)}
          inProgressCount={selectedResult ? undefined : inProgressDates.get(selected)}
        />
      ) : (
        <div className="mt-4 text-center text-sm text-primary-500 dark:text-primary-200">
          Loading…
        </div>
      )}
    </ArchiveCalendar>
  )
}
