import type { ReactNode } from "react"
import {
  calculateJourneyStats,
  getJourneyHistory,
  type JourneyLeague,
} from "@/games/journeyman/utils/journey-daily"
import type { SportConfig, SportInfo, SportVariant } from "@/games/playerdle/sports"
import { calculateStats, getGameHistory, type Stats } from "@/games/playerdle/utils/stats"
import { CountUp, StatBar, StatsTabs, type StatsTab } from "@/shared/components"
import { getTodayKey } from "@/shared/utils/time"

interface AllStatsContentProps {
  sport: SportConfig | SportInfo
  journeyLeague?: JourneyLeague | null
  className?: string
}

function todayHighlightKey(
  history: Array<{ date: string; won: boolean; guesses: number }>,
): string | undefined {
  const r = history.find(entry => entry.date === getTodayKey())
  if (!r) return undefined
  return r.won ? String(r.guesses) : undefined
}

export function StatsBlock({
  stats,
  maxGuesses,
  highlightKey,
}: {
  stats: Stats
  maxGuesses: number
  highlightKey?: string
}) {
  const maxGuessCount = Math.max(
    ...Object.values<number>(stats.guessDistribution),
    1,
  )
  const rows: Array<{ key: string; label: string; count: number; isLoss: boolean }> = [
    ...Array.from({ length: maxGuesses }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1),
      count: stats.guessDistribution[i + 1] || 0,
      isLoss: false,
    })),
  ]

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
      {rows.map(row => (
        <StatBar
          key={row.key}
          label={row.label}
          count={row.count}
          maxCount={maxGuessCount}
          isLoss={row.isLoss}
          highlight={row.key === highlightKey}
        />
      ))}
    </section>
  )
}

function Tile({ value, label }: { value: number; label: ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-light text-primary-900 dark:text-primary-50">
        <CountUp value={value} />
      </div>
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
      content: (
        <StatsBlock
          stats={calculateStats(sport.id)}
          maxGuesses={6}
          highlightKey={todayHighlightKey(getGameHistory(sport.id))}
        />
      ),
    },
    ...variants.map(variant => ({
      id: `variant:${variant.id}`,
      label: variant.label,
      content: (
        <StatsBlock
          stats={calculateStats(sport.id, variant.id)}
          maxGuesses={6}
          highlightKey={todayHighlightKey(getGameHistory(sport.id, variant.id))}
        />
      ),
    })),
    ...(journeyLeague
      ? [
          {
            id: "journeyman",
            label: "Journeyman",
            content: (
              <StatsBlock
                stats={calculateJourneyStats(journeyLeague)}
                maxGuesses={5}
                highlightKey={todayHighlightKey(getJourneyHistory(journeyLeague))}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <StatsTabs
      tabs={tabs}
      className={className}
      ariaLabel="Game mode stats"
    />
  )
}
