import {
  faAngleLeft,
  faChartSimple,
  faCircleQuestion,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { LeagueFooter } from "@/components"
import { type SportId } from "@/sports"
import { hasPlayedJourneyDailyToday } from "@/utils/journey-daily"
import JourneyCalendar from "./journey-calendar"
import JourneyGame, { type JourneyGameMode } from "./journey-game"
import JourneyHowToPlay from "./journey-how-to-play"
import JourneyMenu from "./journey-menu"
import JourneyStatsOverlay from "./journey-stats-overlay"

interface Props {
  screen: "menu" | "daily" | "arcade"
}

type GameOverlay = "none" | "guide" | "stats" | "calendar"
const TUTORIAL_SEEN_KEY = "journey-tutorial-seen"

export default function JourneyShell({ screen }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const playedToday = hasPlayedJourneyDailyToday()
  const initialShowStats = Boolean(
    (location.state as { showStats?: boolean } | null)?.showStats,
  )
  const [overlay, setOverlay] = useState<GameOverlay>(initialShowStats ? "stats" : "none")
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    document.title = "Journey"
  }, [])

  useEffect(() => {
    if (screen !== "daily") return
    if (initialShowStats) return
    if (localStorage.getItem(TUTORIAL_SEEN_KEY)) return
    setIsOnboarding(true)
    setOverlay("guide")
  }, [screen, initialShowStats])

  function handleSelectSport(sportId: SportId) {
    if (sportId === "nfl") {
      navigate("/")
      return
    }
    navigate(`/${sportId}`)
  }

  function goToMenu() {
    navigate("/colors")
  }

  function closeGuide() {
    if (isOnboarding) {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "true")
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

  if (screen === "menu") {
    return (
      <>
        <div className="app-viewport pb-11 flex flex-col bg-primary-50 dark:bg-primary-900">
          <JourneyMenu
            onPlayDaily={() => navigate("/colors/journey/daily")}
            onPlayArcade={() => navigate("/colors/journey/arcade")}
            onShowStats={() =>
              navigate("/colors/journey/daily", { state: { showStats: true } })
            }
            playedToday={playedToday}
          />
        </div>
        <LeagueFooter
          currentSportId="nfl"
          onSelectSport={handleSelectSport}
          colorsActive
          onSelectColors={() => navigate("/colors")}
        />
      </>
    )
  }

  const mode: JourneyGameMode = screen === "arcade" ? "arcade" : "daily"
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
          Journey
        </h1>
        <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">
          {mode === "daily" ? "Daily puzzle" : "Arcade"}
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
          className={`crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden ${overlay === "none" ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <JourneyGame
            key={mode}
            mode={mode}
          />
        </div>
        <div
          className={`crossfade-panel absolute inset-0 px-4 pb-4 overflow-hidden flex min-h-0 ${isGuideOpen ? "crossfade-active" : "crossfade-inactive"}`}
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
              className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              onOpenCalendar={() => setOverlay("calendar")}
            />
          </div>
        </div>
        <div
          className={`crossfade-panel absolute inset-0 px-4 pb-4 overflow-hidden ${isStatsOpen ? "crossfade-active" : "crossfade-inactive"}`}
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
            <JourneyStatsOverlay className="-mt-1 flex-1 overflow-auto pb-2" />
          </div>
        </div>
        <div
          className={`crossfade-panel absolute inset-0 overflow-hidden ${overlay === "calendar" ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <JourneyCalendar onClose={() => setOverlay("none")} />
        </div>
      </div>
    </div>
  )
}
