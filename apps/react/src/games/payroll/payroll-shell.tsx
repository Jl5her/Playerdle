import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { PayrollLeague } from "@/games/payroll/utils/payroll-daily"
import { calculatePayrollStats, type PayrollStats } from "@/games/payroll/utils/payroll-daily"
import { Panel } from "@/shared/components"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import { PanelStackContext } from "@/shared/hooks/use-panel-context"
import { formatLongDate } from "@/shared/utils/time"
import PayrollCalendar from "./payroll-calendar"
import PayrollGame, { type PayrollGameMode } from "./payroll-game"

interface Props {
  league: PayrollLeague
  screen: "daily" | "arcade"
  archiveDateKey?: string
}

type PayrollPanel = "how-to-play" | "stats" | "calendar"

function HowToPlayPanel() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-primary-800 dark:text-primary-100 space-y-4">
      <p>
        <strong>Cap Crunch</strong> shows you the offensive payroll of an NFL team. Player names are
        hidden — only their salaries are shown.
      </p>
      <p>
        Guess which team it is in <strong>5 tries</strong>. After each guess you'll see whether that
        team's position groups cost <strong>more, less, or about the same</strong> as the answer.
      </p>
      <div className="space-y-2">
        <div className="font-semibold uppercase tracking-wider text-xs text-primary-500 dark:text-primary-300">
          Position Groups
        </div>
        <ul className="space-y-1">
          <li>
            <strong>QB</strong> — starting quarterback AAV
          </li>
          <li>
            <strong>RB</strong> — starting running back AAV
          </li>
          <li>
            <strong>TE</strong> — starting tight end AAV
          </li>
          <li>
            <strong>WR ×3</strong> — combined salary of the top 3 wide receivers
          </li>
          <li>
            <strong>OL ×5</strong> — combined salary of the starting offensive line
          </li>
        </ul>
      </div>
      <div className="space-y-2">
        <div className="font-semibold uppercase tracking-wider text-xs text-primary-500 dark:text-primary-300">
          Feedback
        </div>
        <ul className="space-y-1">
          <li>
            <strong>Green ✓</strong> — correct team
          </li>
          <li>
            <strong>Yellow ↑↓</strong> — within close range (QB ±$5M, RB/TE ±$2-2.5M, WR ±$7M,
            OL ±$10M); arrow still points toward the answer
          </li>
          <li>
            <strong>Red ↑↓</strong> — far off; ↑ means answer pays more, ↓ means answer pays less
          </li>
        </ul>
      </div>
      <p className="text-primary-500 dark:text-primary-300 text-xs">
        Salaries are 2025 Average Annual Values (AAV) sourced from Spotrac. A new puzzle is
        available every day.
      </p>
    </div>
  )
}

function StatsPanel({
  stats,
  guesses,
  won,
  onViewArchive,
}: {
  stats: PayrollStats | null
  guesses: number
  won: boolean
  onViewArchive?: () => void
}) {
  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary-400 dark:text-primary-500 text-sm">
        No games played yet.
      </div>
    )
  }
  const maxBar = Math.max(...Object.values(stats.guessDistribution), 1)
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { value: stats.played, label: "Played" },
          { value: stats.winPercentage, label: "Win %" },
          { value: stats.currentStreak, label: "Current\nStreak" },
          { value: stats.maxStreak, label: "Max\nStreak" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-4xl font-light text-primary-900 dark:text-primary-50">{value}</div>
            <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light leading-tight whitespace-pre-line">
              {label}
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
        Guess Distribution
      </h3>
      {Array.from({ length: 5 }, (_, i) => i + 1).map(num => {
        const count = stats.guessDistribution[num] || 0
        const scaledWidth = maxBar > 0 ? (count / maxBar) * 100 : 0
        const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`
        const isHighlighted = won && num === guesses
        return (
          <div key={num} className="flex items-center mb-1 gap-2">
            <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
              {num}
            </div>
            <div className="flex-1">
              <div
                className={clsx(
                  "min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end",
                  count > 0
                    ? isHighlighted
                      ? "bg-primary-700 text-primary-50"
                      : "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                    : "bg-primary-100 dark:bg-primary-800 text-primary-500",
                )}
                style={{ width: barWidth }}
              >
                {count}
              </div>
            </div>
          </div>
        )
      })}
      {onViewArchive && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onViewArchive}
            className="px-4 py-2 text-sm font-semibold text-primary-500 dark:text-primary-200 border border-primary-300 dark:border-primary-700 rounded hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors uppercase tracking-wider"
          >
            View Archive
          </button>
        </div>
      )}
    </div>
  )
}

export default function PayrollShell({ league, screen, archiveDateKey }: Props) {
  const navigate = useNavigate()
  const panels = usePanelStack<PayrollPanel>()
  const isArchive = !!archiveDateKey
  const mode: PayrollGameMode = screen === "arcade" ? "arcade" : "daily"
  const [activeMode, setActiveMode] = useState<PayrollGameMode>(mode)
  const [gameResult, setGameResult] = useState<{ won: boolean; guessCount: number } | null>(null)

  useEffect(() => {
    document.title = "Cap Crunch · NFL"
  }, [])

  useEffect(() => {
    if (screen !== "daily" || isArchive) return
    const seen = localStorage.getItem("payroll-tutorial-seen:nfl")
    if (!seen) {
      panels.push("how-to-play")
      localStorage.setItem("payroll-tutorial-seen:nfl", "true")
    }
  }, [screen, isArchive])

  const stats = calculatePayrollStats(league)

  function goBack() {
    if (isArchive) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  let subtitle: string
  if (isArchive && archiveDateKey) {
    subtitle = `Archive · ${formatLongDate(new Date(archiveDateKey + "T12:00:00"))}`
  } else if (activeMode === "arcade") {
    subtitle = "Arcade mode"
  } else {
    subtitle = formatLongDate()
  }

  return (
    <PanelStackContext.Provider value={panels}>
      <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
        <header className="game-header bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center border-b-2 border-primary-300 dark:border-primary-700">
          <button
            onClick={goBack}
            aria-label={isArchive ? "Back to calendar" : "Back to menu"}
            title="Back"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary-900 dark:text-primary-50 bg-transparent rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-colors"
          >
            <FontAwesomeIcon icon={faAngleLeft} className="text-[1.7rem]" aria-hidden="true" />
          </button>
          <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
            Cap Crunch
          </h1>
          <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">{subtitle}</p>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
{!panels.isAnyOpen && (
              <button
                onClick={() => panels.push("stats")}
                aria-label="Show stats"
                title="Stats"
                className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
              >
                <FontAwesomeIcon icon={faChartSimple} className="text-[1.15rem]" aria-hidden="true" />
              </button>
            )}
            {!panels.isAnyOpen && (
              <button
                onClick={() => panels.push("how-to-play")}
                aria-label="How to play"
                title="How to play"
                className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
              >
                <FontAwesomeIcon icon={faCircleQuestion} className="text-[1.2rem]" aria-hidden="true" />
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
              <PayrollGame
                key={`${league}:${mode}:${archiveDateKey ?? "today"}`}
                league={league}
                mode={mode}
                archiveDateKey={archiveDateKey}
                onModeChange={setActiveMode}
                onGameOver={(won, guessCount) => setGameResult({ won, guessCount })}
              />
            </div>

            <Panel open={panels.isOpen("how-to-play")} onClose={panels.pop} title="How to Play" layout="scroll">
              <HowToPlayPanel />
            </Panel>

            <Panel open={panels.isOpen("stats")} onClose={panels.pop} title="Statistics" layout="scroll">
              <StatsPanel
                stats={stats}
                guesses={gameResult?.guessCount ?? 0}
                won={gameResult?.won ?? false}
                onViewArchive={isArchive ? undefined : () => panels.push("calendar")}
              />
            </Panel>

            <PayrollCalendar league={league} panel id="calendar" />
          </div>
        </div>
      </div>
    </PanelStackContext.Provider>
  )
}
