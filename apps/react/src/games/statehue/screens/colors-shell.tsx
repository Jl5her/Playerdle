import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { ColorsVariant } from "@/games/statehue/utils/colors-daily"
import { ResultsSlidePanel } from "@/shared/components"
import { formatLongDate } from "@/shared/utils/time"
import ColorsCalendar from "./colors-calendar"
import ColorsGame, { type ColorsGameMode } from "./colors-game"
import ColorsHowToPlay from "./colors-how-to-play"
import ColorsStatsOverlay from "./colors-stats-overlay"

interface Props {
  screen: "daily" | "arcade"
  variant?: ColorsVariant
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function tutorialSeenKey(variant: ColorsVariant): string {
  return variant === "collegiate" ? "statehue-collegiate-tutorial-seen" : "statehue-tutorial-seen"
}

export default function ColorsShell({ screen, variant = "pro" }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const [guideOpen, setGuideOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(initialShowStats)
  const [calendarOpen, setCalendarOpen] = useState(false)
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
    setGuideOpen(true)
  }, [screen, initialShowStats])

  function goToMenu() {
    navigate("/statehue")
  }

  function closeGuide() {
    if (isOnboarding) {
      localStorage.setItem(tutorialSeenKey(variant), "true")
      setIsOnboarding(false)
    }
    setGuideOpen(false)
  }

  function openStats() {
    setGuideOpen(false)
    setStatsOpen(true)
  }

  function openGuide() {
    setIsOnboarding(false)
    setStatsOpen(false)
    setGuideOpen(true)
  }

  function closeStats() {
    setStatsOpen(false)
  }

  function closeCalendar() {
    setCalendarOpen(false)
  }

  function openCalendar() {
    setCalendarOpen(true)
  }

  function closeAllPanels() {
    setGuideOpen(false)
    setStatsOpen(false)
    setCalendarOpen(false)
  }

  const anyPanelOpen = guideOpen || statsOpen || calendarOpen

  const mode: ColorsGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<ColorsGameMode>(mode)
  useEffect(() => {
    setActiveMode(mode)
  }, [mode])
  const isArchive = !!archiveDateKey
  const subtitle = isArchive
    ? formatLongDate(parseDateKey(archiveDateKey))
    : activeMode === "arcade"
      ? "Arcade mode"
      : formatLongDate()

  function exitArchive() {
    setArchiveDateKey(null)
    setGuideOpen(false)
    setStatsOpen(false)
    setCalendarOpen(true)
    setCalendarHistoryVersion(v => v + 1)
  }

  function handleBack() {
    if (isArchive) {
      exitArchive()
    } else {
      goToMenu()
    }
  }

  const calendarTitle = variant === "collegiate" ? "Collegiate Archive" : "Statehue Archive"

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
          {variant === "collegiate" ? "Collegiate" : "Statehue"}
        </h1>
        <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">
          {subtitle}
        </p>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {!anyPanelOpen && (
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
          {!anyPanelOpen && (
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
            anyPanelOpen ? "crossfade-inactive" : "crossfade-active",
          )}
        >
          {isArchive ? (
            <ColorsGame
              key={`archive:${variant}:${archiveDateKey}`}
              mode="daily"
              variant={variant}
              archiveDateKey={archiveDateKey}
            />
          ) : (
            <ColorsGame
              key={`${variant}:${mode}`}
              mode={mode}
              variant={variant}
              onModeChange={setActiveMode}
              onBackToToday={
                screen === "arcade"
                  ? () =>
                      navigate(
                        variant === "collegiate" ? "/statehue/collegiate" : "/statehue/daily",
                      )
                  : undefined
              }
            />
          )}
        </div>
        <ResultsSlidePanel
          open={guideOpen}
          onClose={closeGuide}
          title="How to Play"
        >
          <div className="w-full max-w-2xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-4">
            <ColorsHowToPlay
              className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              variant={variant}
              onOpenCalendar={openCalendar}
            />
          </div>
        </ResultsSlidePanel>
        <ResultsSlidePanel
          open={statsOpen}
          onClose={closeStats}
          title="Statistics"
        >
          <div className="w-full max-w-2xl mx-auto flex-1 overflow-auto px-4 pb-4 -mt-1">
            <ColorsStatsOverlay
              variant={variant}
              onViewArchive={openCalendar}
            />
          </div>
        </ResultsSlidePanel>
        <ResultsSlidePanel
          open={calendarOpen}
          onClose={closeCalendar}
          title={calendarTitle}
        >
          <ColorsCalendar
            variant={variant}
            panel
            onPlayArchive={dateKey => {
              setArchiveDateKey(dateKey)
              closeAllPanels()
            }}
            historyVersion={calendarHistoryVersion}
          />
        </ResultsSlidePanel>
        </div>
      </div>
    </div>
  )
}
