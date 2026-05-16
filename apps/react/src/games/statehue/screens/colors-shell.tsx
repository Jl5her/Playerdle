import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { ColorsVariant } from "@/games/statehue/utils/colors-daily"
import { PanelStackContext } from "@/shared/hooks/use-panel-context"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import { formatLongDate } from "@/shared/utils/time"
import ColorsCalendar from "./colors-calendar"
import ColorsGame, { type ColorsGameMode } from "./colors-game"
import ColorsHowToPlay, { colorsTutorialSeenKey } from "./colors-how-to-play"
import ColorsStatsOverlay from "./colors-stats-overlay"

interface Props {
  screen: "daily" | "arcade"
  variant?: ColorsVariant
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

type ColorsPanel = "guide" | "stats" | "calendar"

export default function ColorsShell({ screen, variant = "pro" }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialShowStats = Boolean((location.state as { showStats?: boolean } | null)?.showStats)
  const panels = usePanelStack<ColorsPanel>(initialShowStats ? "stats" : undefined)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)

  useEffect(() => {
    document.title = "Playerdle Statehue"
  }, [])

  useEffect(() => {
    if (screen !== "daily") return
    if (initialShowStats) return
    if (localStorage.getItem(colorsTutorialSeenKey(variant))) return
    panels.push("guide")
  }, [screen, initialShowStats])

  function goToMenu() {
    navigate("/statehue")
  }

  const isArchive = !!archiveDateKey
  const mode: ColorsGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<ColorsGameMode>(mode)
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
            {variant === "collegiate" ? "Collegiate" : "Statehue"}
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
                onClick={() => panels.push("guide")}
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
            <ColorsHowToPlay
              id="guide"
              variant={variant}
              onOpenCalendar={() => panels.push("calendar")}
            />
            <ColorsStatsOverlay
              id="stats"
              variant={variant}
              onViewArchive={() => panels.push("calendar")}
            />
            <ColorsCalendar
              id="calendar"
              variant={variant}
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
