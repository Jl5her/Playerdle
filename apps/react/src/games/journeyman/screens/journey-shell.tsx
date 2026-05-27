import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getLeagueJourneyData } from "@playerdle/data/journeyman/leagues"
import clsx from "clsx"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { JourneyLeague } from "@/games/journeyman/utils/journey-daily"
import { PanelStackContext } from "@/shared/hooks/use-panel-context"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import { formatLongDate } from "@/shared/utils/time"
import { trackPanelOpened } from "@/lib/analytics"
import JourneyCalendar from "./journey-calendar"
import JourneyGame, { type JourneyGameMode } from "./journey-game"
import JourneyHowToPlay, { journeyTutorialSeenKey } from "./journey-how-to-play"
import JourneyStatsOverlay from "./journey-stats-overlay"

interface Props {
  league: JourneyLeague
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// One-time migration for the legacy NFL-only tutorial key so existing users
// don't see onboarding again.
const LEGACY_NFL_TUTORIAL_KEY = "journey-tutorial-seen"
function migrateLegacyTutorialFlagIfNeeded(league: JourneyLeague) {
  if (typeof localStorage === "undefined") return
  try {
    const newKey = journeyTutorialSeenKey(league)
    if (!localStorage.getItem(newKey) && localStorage.getItem(LEGACY_NFL_TUTORIAL_KEY)) {
      localStorage.setItem(newKey, "true")
    }
  } catch {
    // ignore
  }
}

type JourneyPanel = "guide" | "stats" | "calendar"

export default function JourneyShell({ league }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const leagueData = useMemo(() => getLeagueJourneyData(league), [league])
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const panels = usePanelStack<JourneyPanel>(initialShowStats ? "stats" : undefined)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  // activeMode tracks the current mode for the subtitle; the game manages transitions internally.
  const [activeMode, setActiveMode] = useState<JourneyGameMode>("daily")
  const tutorialCheckedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    document.title = `Playerdle Journeyman ${leagueData.label}`
  }, [leagueData.label])

  // Show onboarding tutorial the first time a player visits this league
  useEffect(() => {
    if (tutorialCheckedRef.current.has(league)) return
    tutorialCheckedRef.current.add(league)
    if (initialShowStats) return // Don't show tutorial when opening straight to stats
    migrateLegacyTutorialFlagIfNeeded(league)
    if (localStorage.getItem(journeyTutorialSeenKey(league))) return
    panels.push("guide")
    trackPanelOpened({ panel: "guide", game: "journeyman", sport: league, mode: "daily", is_onboarding: true })
    // panels is intentionally omitted — we only want this to fire once per league
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league])

  function goToMenu() {
    if (league === "nfl") {
      navigate("/")
    } else {
      navigate(`/${league}`)
    }
  }

  const isArchive = !!archiveDateKey

  const subtitle = isArchive
    ? formatLongDate(parseDateKey(archiveDateKey))
    : activeMode === "arcade"
      ? "Arcade mode"
      : formatLongDate()

  function exitArchive() {
    setArchiveDateKey(null)
    panels.clear()
    panels.push("calendar")
    setCalendarHistoryVersion(v => v + 1)
  }

  function handleBack() {
    if (isArchive) {
      exitArchive()
    } else {
      goToMenu()
    }
  }

  return (
    <PanelStackContext.Provider value={panels}>
      <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
        <header className="game-header bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center border-b-2 border-primary-300 dark:border-primary-700">
          <button
            onClick={handleBack}
            aria-label={isArchive ? "Back to archive" : "Back to menu"}
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
            Journeyman {leagueData.label}
          </h1>
          <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">
            {subtitle}
          </p>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!panels.isAnyOpen && (
              <button
                onClick={() => {
                  panels.push("stats")
                  trackPanelOpened({ panel: "stats", game: "journeyman", sport: league, mode: activeMode })
                }}
                aria-label="Show stats"
                title="Stats"
                className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
              >
                <FontAwesomeIcon
                  icon={faChartSimple}
                  className="text-[1.15rem]"
                  aria-hidden="true"
                />
              </button>
            )}
            {!panels.isAnyOpen && (
              <button
                onClick={() => {
                  panels.push("guide")
                  trackPanelOpened({ panel: "guide", game: "journeyman", sport: league, mode: activeMode })
                }}
                aria-label="Show tutorial"
                title="How to play"
                className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
              >
                <FontAwesomeIcon
                  icon={faCircleQuestion}
                  className="text-[1.2rem]"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </header>
        <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
          <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
            <div
              className={clsx(
                "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
                panels.isAnyOpen ? "crossfade-inactive" : "crossfade-active",
              )}
            >
              {isArchive ? (
                <JourneyGame
                  key={`archive:${league}:${archiveDateKey}`}
                  league={league}
                  mode="daily"
                  archiveDateKey={archiveDateKey}
                />
              ) : (
                <JourneyGame
                  key={league}
                  league={league}
                  mode="daily"
                  onModeChange={setActiveMode}
                />
              )}
            </div>
            <JourneyHowToPlay
              id="guide"
              league={league}
              onOpenCalendar={() => panels.push("calendar")}
            />
            <JourneyStatsOverlay
              id="stats"
              league={league}
              onViewArchive={() => panels.push("calendar")}
            />
            <JourneyCalendar
              id="calendar"
              league={league}
              panel
              onPlayArchive={dateKey => {
                setArchiveDateKey(dateKey)
                panels.clear()
                setCalendarHistoryVersion(v => v + 1)
              }}
              historyVersion={calendarHistoryVersion}
            />
          </div>
        </div>
      </div>
    </PanelStackContext.Provider>
  )
}
