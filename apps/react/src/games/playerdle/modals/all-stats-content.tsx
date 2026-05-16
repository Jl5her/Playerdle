import clsx from "clsx"
import { useState, type ReactNode } from "react"
import {
  calculateJourneyStats,
  type JourneyLeague,
} from "@/games/journeyman/utils/journey-daily"
import type { SportConfig, SportInfo, SportVariant } from "@/games/playerdle/sports"
import { calculateStats, type Stats } from "@/games/playerdle/utils/stats"

interface AllStatsContentProps {
  sport: SportConfig | SportInfo
  journeyLeague?: JourneyLeague | null
  className?: string
}

interface StatsTab {
  id: string
  label: string
  stats: Stats
  maxGuesses: number
}

function StatsBlock({ stats, maxGuesses }: { stats: Stats; maxGuesses: number }) {
  const maxGuessCount = Math.max(...Object.values<number>(stats.guessDistribution), 1)
  const rows = Array.from({ length: maxGuesses }, (_, i) => i + 1)

  return (
    <section>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Tile value={stats.played} label="Played" />
        <Tile value={stats.winPercentage} label="Win %" />
        <Tile value={stats.currentStreak} label={<>Current<br />Streak</>} />
        <Tile value={stats.maxStreak} label={<>Max<br />Streak</>} />
      </div>
      <h4 className="text-xs font-semibold text-primary-700 dark:text-primary-200 mb-2 uppercase text-left tracking-wide">
        Guess Distribution
      </h4>
      {rows.map(guessNum => {
        const count = stats.guessDistribution[guessNum] || 0
        const hasValue = count > 0
        const scaledWidth = (count / maxGuessCount) * 100
        const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`
        return (
          <div
            key={guessNum}
            className="flex items-center mb-1 gap-2"
          >
            <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
              {guessNum}
            </div>
            <div className="flex-1">
              <div
                className={`min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end ${
                  hasValue
                    ? "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                    : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300"
                }`}
                style={{ width: barWidth }}
              >
                {count}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function Tile({ value, label }: { value: number; label: ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-light text-primary-900 dark:text-primary-50">{value}</div>
      <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight font-light">
        {label}
      </div>
    </div>
  )
}

export function AllStatsContent({ sport, journeyLeague, className }: AllStatsContentProps) {
  const variants =
    "variants" in sport && Array.isArray(sport.variants) ? (sport.variants as SportVariant[]) : []

  const tabs: StatsTab[] = [
    {
      id: "classic",
      label: "Playerdle",
      stats: calculateStats(sport.id),
      maxGuesses: 6,
    },
    ...variants.map(variant => ({
      id: `variant:${variant.id}`,
      label: variant.label,
      stats: calculateStats(sport.id, variant.id),
      maxGuesses: 6,
    })),
    ...(journeyLeague
      ? [
          {
            id: "journeyman",
            label: "Journeyman",
            stats: calculateJourneyStats(journeyLeague),
            maxGuesses: 5,
          },
        ]
      : []),
  ]

  const [activeId, setActiveId] = useState(tabs[0].id)
  const activeTab = tabs.find(tab => tab.id === activeId) ?? tabs[0]

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Game mode stats"
        className="flex gap-1 border-b border-primary-200 dark:border-primary-700 mb-4 -mx-1 px-1 overflow-x-auto"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={clsx(
                "shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px",
                isActive
                  ? "text-primary-900 dark:text-primary-50 border-primary-700 dark:border-primary-100"
                  : "text-primary-500 dark:text-primary-300 border-transparent hover:text-primary-700 dark:hover:text-primary-100",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <StatsBlock stats={activeTab.stats} maxGuesses={activeTab.maxGuesses} />
    </div>
  )
}
