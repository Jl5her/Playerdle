import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getLeagueJourneyData } from "@playerdle/data/journeyman/leagues"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { JourneyLeague } from "@/games/journeyman/utils/journey-daily"
import { ResultsSlidePanel } from "@/shared/components"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import { formatLongDate } from "@/shared/utils/time"
import JourneyCalendar from "./journey-calendar"
import JourneyGame, { type JourneyGameMode } from "./journey-game"
import JourneyHowToPlay from "./journey-how-to-play"
import JourneyStatsOverlay from "./journey-stats-overlay"

interface Props {
  league: JourneyLeague
  screen: "daily" | "arcade"
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function tutorialSeenKey(league: JourneyLeague): string {
  return `journey-tutorial-seen:${league}`
}

// One-time migration for the legacy NFL-only tutorial key so existing users
// don't see onboarding again.
const LEGACY_NFL_TUTORIAL_KEY = "journey-tutorial-seen"
function migrateLegacyTutorialFlagIfNeeded() {
  if (typeof localStorage === "undefined") return
  try {
    const newKey = tutorialSeenKey("nfl")
    if (!localStorage.getItem(newKey) && localStorage.getItem(LEGACY_NFL_TUTORIAL_KEY)) {
      localStorage.setItem(newKey, "true")
    }
  } catch {
    // ignore
  }
}

type JourneyPanel = "guide" | "stats" | "calendar"

export default function JourneyShell({ league, screen }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const leagueData = useMemo(() => getLeagueJourneyData(league), [league])
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const panels = usePanelStack<JourneyPanel>(initialShowStats ? "stats" : undefined)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    document.title = `Playerdle Journeyman ${leagueData.label}`
  }, [leagueData.label])

  useEffect(() => {
    if (screen !== "daily") return
    if (initialShowStats) return
    migrateLegacyTutorialFlagIfNeeded()
    if (localStorage.getItem(tutorialSeenKey(league))) return
    setIsOnboarding(true)
    panels.push("guide")
  }, [screen, initialShowStats, league])

  function goToMenu() {
    if (league === "nfl") {
      navigate("/")
    } else {
      navigate(`/${league}`)
    }
  }

  function closeGuide() {
    if (isOnboarding) {
      localStorage.setItem(tutorialSeenKey(league), "true")
      setIsOnboarding(false)
    }
    panels.pop()
  }

  function openGuide() {
    setIsOnboarding(false)
    panels.push("guide")
  }

  const isArchive = !!archiveDateKey
  const mode: JourneyGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<JourneyGameMode>(mode)
  useEffect(() => {
    setActiveMode(mode)
  }, [mode])

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
              onClick={() => panels.push("stats")}
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
              onClick={openGuide}
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
                key={`${league}:${mode}`}
                league={league}
                mode={mode}
                onModeChange={setActiveMode}
              />
            )}
          </div>
          <ResultsSlidePanel
            open={panels.isOpen("guide")}
            onClose={closeGuide}
            title="How to Play"
          >
            <div className="w-full max-w-2xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-4">
              <JourneyHowToPlay
                league={league}
                className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
                onOpenCalendar={() => panels.push("calendar")}
              />
            </div>
          </ResultsSlidePanel>
          <ResultsSlidePanel
            open={panels.isOpen("stats")}
            onClose={panels.pop}
            title="Statistics"
          >
            <div className="w-full max-w-2xl mx-auto flex-1 overflow-auto px-4 pb-4 -mt-1">
              <JourneyStatsOverlay
                league={league}
                onViewArchive={() => panels.push("calendar")}
              />
            </div>
          </ResultsSlidePanel>
          <ResultsSlidePanel
            open={panels.isOpen("calendar")}
            onClose={panels.pop}
            title={`Journeyman ${leagueData.label} Archive`}
          >
            <JourneyCalendar
              league={league}
              panel
              onPlayArchive={dateKey => {
                setArchiveDateKey(dateKey)
                panels.clear()
                setCalendarHistoryVersion(v => v + 1)
              }}
              historyVersion={calendarHistoryVersion}
            />
          </ResultsSlidePanel>
        </div>
      </div>
    </div>
  )
}
