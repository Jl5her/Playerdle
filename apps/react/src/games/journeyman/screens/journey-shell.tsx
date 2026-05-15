import {
  faAngleLeft,
  faChartSimple,
  faCircleQuestion,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getLeagueJourneyData } from "@playerdle/data/journeyman/leagues"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { JourneyLeague } from "@/games/journeyman/utils/journey-daily"
import { Overlay } from "@/shared/components"
import { formatLongDate } from "@/shared/utils/time"
import JourneyCalendar from "./journey-calendar"
import JourneyGame, { type JourneyGameMode } from "./journey-game"
import JourneyHowToPlay from "./journey-how-to-play"
import JourneyStatsOverlay from "./journey-stats-overlay"

interface Props {
  league: JourneyLeague
  screen: "daily" | "arcade"
}

type GameOverlay = "none" | "guide" | "stats" | "calendar"

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

export default function JourneyShell({ league, screen }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const leagueData = useMemo(() => getLeagueJourneyData(league), [league])
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const [overlay, setOverlay] = useState<GameOverlay>(initialShowStats ? "stats" : "none")
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
    setOverlay("guide")
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
    setOverlay("none")
  }

  function openStats() {
    setOverlay("stats")
  }

  function openGuide() {
    setIsOnboarding(false)
    setOverlay("guide")
  }

  function closeStats() {
    setOverlay("none")
  }

  const mode: JourneyGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<JourneyGameMode>(mode)
  useEffect(() => {
    setActiveMode(mode)
  }, [mode])
  const subtitle = activeMode === "arcade" ? "Arcade mode" : formatLongDate()
  const isGuideOpen = overlay === "guide"
  const isStatsOpen = overlay === "stats"

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
        <button
          onClick={goToMenu}
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
        <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
          Journeyman {leagueData.label}
        </h1>
        <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">
          {subtitle}
        </p>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {overlay === "none" && (
            <button
              onClick={openStats}
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
          {overlay === "none" && (
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <div
          className={clsx(
            "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
            overlay === "none" ? "crossfade-active" : "crossfade-inactive",
          )}
        >
          <JourneyGame
            key={`${league}:${mode}`}
            league={league}
            mode={mode}
            onModeChange={setActiveMode}
          />
        </div>
        <Overlay
          open={isGuideOpen}
          onClose={closeGuide}
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
                onClick={closeGuide}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-2xl"
                />
              </button>
            </div>
            <JourneyHowToPlay
              league={league}
              className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              onOpenCalendar={() => setOverlay("calendar")}
            />
          </div>
        </Overlay>
        <Overlay
          open={isStatsOpen}
          onClose={closeStats}
          className="px-4 pb-4 overflow-hidden"
        >
          <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between pt-3">
              <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                Statistics
              </h2>
              <button
                type="button"
                className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                aria-label="Close stats"
                onClick={closeStats}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-2xl"
                />
              </button>
            </div>
            <JourneyStatsOverlay
              league={league}
              className="-mt-1 flex-1 overflow-auto pb-2"
            />
          </div>
        </Overlay>
        <Overlay
          open={overlay === "calendar"}
          onClose={() => setOverlay("none")}
          className="overflow-hidden"
        >
          <JourneyCalendar
            league={league}
            onClose={() => setOverlay("none")}
          />
        </Overlay>
      </div>
    </div>
  )
}
