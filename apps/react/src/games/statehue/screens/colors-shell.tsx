import {
  faAngleLeft,
  faChartSimple,
  faCircleQuestion,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { ColorsVariant } from "@/games/statehue/utils/colors-daily"
import { Overlay } from "@/shared/components"
import { formatLongDate } from "@/shared/utils/time"
import ColorsCalendar from "./colors-calendar"
import ColorsGame, { type ColorsGameMode } from "./colors-game"
import ColorsHowToPlay from "./colors-how-to-play"
import ColorsStatsOverlay from "./colors-stats-overlay"

interface Props {
  screen: "daily" | "arcade"
  variant?: ColorsVariant
}

type GameOverlay = "none" | "guide" | "stats" | "calendar" | "archive-play"

function tutorialSeenKey(variant: ColorsVariant): string {
  return variant === "collegiate" ? "statehue-collegiate-tutorial-seen" : "statehue-tutorial-seen"
}

export default function ColorsShell({ screen, variant = "pro" }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const [overlay, setOverlay] = useState<GameOverlay>(initialShowStats ? "stats" : "none")
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    document.title = "Playerdle Statehue"
  }, [])

  useEffect(() => {
    if (screen !== "daily") return
    if (initialShowStats) return
    if (localStorage.getItem(tutorialSeenKey(variant))) return
    setIsOnboarding(true)
    setOverlay("guide")
  }, [screen, initialShowStats])

  function goToMenu() {
    navigate("/statehue")
  }

  function closeGuide() {
    if (isOnboarding) {
      localStorage.setItem(tutorialSeenKey(variant), "true")
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

  const mode: ColorsGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<ColorsGameMode>(mode)
  useEffect(() => {
    setActiveMode(mode)
  }, [mode])
  const subtitle = activeMode === "arcade" ? "Arcade mode" : formatLongDate()
  const isGuideOpen = overlay === "guide"
  const isStatsOpen = overlay === "stats"

  return (
    <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
      <header className="game-header bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center border-b-2 border-primary-300 dark:border-primary-700">
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
          {variant === "collegiate" ? "Collegiate" : "Statehue"}
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative pt-[3.75rem]">
        <div
          className={clsx(
            "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
            overlay === "none" ? "crossfade-active" : "crossfade-inactive",
          )}
        >
          <ColorsGame
            key={`${variant}:${mode}`}
            mode={mode}
            variant={variant}
            onModeChange={setActiveMode}
            onBackToToday={
              screen === "arcade"
                ? () => navigate(variant === "collegiate" ? "/statehue/collegiate" : "/statehue/daily")
                : undefined
            }
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
            <ColorsHowToPlay
              className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              variant={variant}
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
            <ColorsStatsOverlay
              variant={variant}
              className="-mt-1 flex-1 overflow-auto pb-2"
              onViewArchive={() => setOverlay("calendar")}
            />
          </div>
        </Overlay>
        <Overlay
          open={overlay === "calendar"}
          onClose={() => setOverlay("none")}
          className="overflow-hidden"
        >
          <ColorsCalendar
            variant={variant}
            onClose={() => setOverlay("none")}
            onPlayArchive={dateKey => {
              setArchiveDateKey(dateKey)
              setOverlay("archive-play")
            }}
            historyVersion={calendarHistoryVersion}
          />
        </Overlay>
        <Overlay
          open={overlay === "archive-play"}
          onClose={() => {
            setOverlay("calendar")
            setArchiveDateKey(null)
            setCalendarHistoryVersion(v => v + 1)
          }}
          className="overflow-hidden"
        >
          {archiveDateKey && (
            <div className="flex flex-col h-full min-h-0 bg-primary-50 dark:bg-primary-900">
              <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b-2 border-primary-300 dark:border-primary-700 bg-primary-100/60 dark:bg-primary-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setOverlay("calendar")
                    setArchiveDateKey(null)
                    setCalendarHistoryVersion(v => v + 1)
                  }}
                  aria-label="Back to archive"
                  className="p-2 -ml-1 text-primary-900 dark:text-primary-50 rounded hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                >
                  <FontAwesomeIcon icon={faAngleLeft} className="text-lg" />
                </button>
                <span className="text-[10px] uppercase tracking-wider font-bold text-primary-500 dark:text-primary-200">
                  Archive ·
                </span>
                <span className="text-xs font-bold text-primary-900 dark:text-primary-50">
                  {archiveDateKey}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ColorsGame
                  key={`archive:${variant}:${archiveDateKey}`}
                  mode="daily"
                  variant={variant}
                  archiveDateKey={archiveDateKey}
                />
              </div>
            </div>
          )}
        </Overlay>
      </div>
    </div>
  )
}
