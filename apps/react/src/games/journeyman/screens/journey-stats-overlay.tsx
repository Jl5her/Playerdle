import clsx from "clsx"
import { calculateJourneyStats } from "@/games/journeyman/utils/journey-daily"

interface Props {
  className?: string
}

export default function JourneyStatsOverlay({ className }: Props) {
  const stats = calculateJourneyStats()
  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)

  return (
    <div className={clsx("text-center px-6 py-6", className)}>
      <div className="grid grid-cols-4 gap-2 mb-6">
        <Stat
          value={stats.played}
          label="Played"
        />
        <Stat
          value={stats.winPercentage}
          label="Win %"
        />
        <Stat
          value={stats.currentStreak}
          label={"Current\nStreak"}
        />
        <Stat
          value={stats.maxStreak}
          label={"Max\nStreak"}
        />
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
          Guess Distribution
        </h3>
        {[1, 2, 3, 4, 5].map(num => {
          const count = stats.guessDistribution[num] || 0
          const has = count > 0
          const scaled = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0
          const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaled, 12)}%`
          return (
            <div
              key={num}
              className="flex items-center mb-1 gap-2"
            >
              <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
                {num}
              </div>
              <div className="flex-1">
                <div
                  className={clsx(
                    "min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end",
                    has
                      ? "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                      : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300",
                  )}
                  style={{ width: barWidth }}
                >
                  {count}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-light text-primary-900 dark:text-primary-50">{value}</div>
      <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light leading-tight whitespace-pre-line">
        {label}
      </div>
    </div>
  )
}
