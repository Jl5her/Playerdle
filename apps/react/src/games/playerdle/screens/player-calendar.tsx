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
import { ArchiveCalendar, Panel } from "@/shared/components"
import { PanelStackContext, usePanelContext } from "@/shared/hooks/use-panel-context"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
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

/** Standalone archive game view (non-panel route mode) with its own panel context. */
function ArchiveGameView({
  sport,
  variantId,
  archiveDateKey,
  sportMeta,
  onBack,
}: {
  sport: SportConfig
  variantId?: string
  archiveDateKey: string
  sportMeta: ReturnType<typeof getSportMetaById>
  onBack: () => void
}) {
  const panels = usePanelStack<"guide">()
  const archiveSubtitle = formatLongDate(parseDateKey(archiveDateKey))
  return (
    <PanelStackContext.Provider value={panels}>
      <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
        <Header
          sport={sportMeta}
          subtitle={archiveSubtitle}
          onBack={onBack}
          onShowTutorial={panels.isAnyOpen ? undefined : () => panels.push("guide")}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
          <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
            <div
              className={clsx(
                "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
                panels.isAnyOpen ? "crossfade-inactive" : "crossfade-active",
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
            <GameGuideContent id="guide" sport={sport} mode="manual" />
          </div>
        </div>
      </div>
    </PanelStackContext.Provider>
  )
}

interface PlayerCalendarProps {
  variantId?: string
  /** When true, renders as a panel (no app-viewport shell, no inline archive game). */
  panel?: boolean
  /** Panel ID in context; required when panel=true. */
  id?: string
  /** Called when the user selects a date to play in panel mode. */
  onPlayArchive?: (dateKey: string) => void
  /** Bump to force a re-read of history after an archive play. */
  historyVersion?: number
}

export default function PlayerCalendar({
  variantId,
  panel = false,
  id,
  onPlayArchive,
  historyVersion = 0,
}: PlayerCalendarProps = {}) {
  const ctx = usePanelContext()
  const navigate = useNavigate()
  const { sport: sportParam } = useParams<{ sport?: string }>()
  const sportId = getSportIdFromParam(sportParam) ?? "nfl"
  const sportMeta = getSportMetaById(sportId)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const today = useMemo(() => parseDateKey(getTodayKey()), [])
  const [selected, setSelected] = useState<string>(formatDateKey(today))
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)

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
  }, [sportId, variantId, archiveDateKey, historyVersion])

  const inProgressDates = useInProgressDates(
    `playerdle-state:${sportId}:${variantId ?? "classic"}:`,
    [archiveDateKey, historyVersion],
  )

  const selectedDate = useMemo(() => parseDateKey(selected), [selected])
  const menuPath = sportId === "nfl" ? "/" : `/${sportId}`

  // Non-panel mode: show archive game inline when a date is selected
  if (!panel && archiveDateKey && sport) {
    return (
      <ArchiveGameView
        sport={sport}
        variantId={variantId}
        archiveDateKey={archiveDateKey}
        sportMeta={sportMeta}
        onBack={() => setArchiveDateKey(null)}
      />
    )
  }

  const selectedResult = history.get(selected)
  const selectedIsFuture = selectedDate.getTime() > today.getTime()
  const selectedIsBeforeEpoch = selectedDate.getTime() < PLAYER_EPOCH.getTime()
  const canPlay = !selectedIsFuture && !selectedIsBeforeEpoch

  function handlePlay() {
    if (panel && onPlayArchive) {
      onPlayArchive(selected)
    } else {
      setArchiveDateKey(selected)
    }
  }

  const calendarTitle = `${sportMeta.displayName} Archive`

  const calendar = (
    <ArchiveCalendar
      title={calendarTitle}
      onClose={panel ? undefined : () => navigate(menuPath)}
      panel={panel}
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
          canPlay={canPlay}
          onPlay={handlePlay}
          onViewResults={handlePlay}
          inProgressCount={selectedResult ? undefined : inProgressDates.get(selected)}
        />
      ) : (
        <div className="mt-4 text-center text-sm text-primary-500 dark:text-primary-200">
          Loading…
        </div>
      )}
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
