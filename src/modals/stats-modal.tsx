import { calculateStats } from "@/utils/stats"
import type { SportConfig } from "@/sports"

interface Props {
  onClose: () => void
  sport: SportConfig
}

export default function StatsModal({ onClose, sport }: Props) {
  const stats = calculateStats(sport.id)
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-1000 p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-50 dark:bg-primary-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto border-2 border-primary-300 dark:border-primary-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b-2 border-primary-300 dark:border-primary-700">
          <div>
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-50 m-0">
              Statistics ({sport.displayName})
            </h2>
            <p className="text-xs text-primary-500 dark:text-primary-200 mt-1">{dateStr}</p>
          </div>
          <button
            className="bg-transparent border-none text-primary-500 dark:text-primary-200 text-2xl cursor-pointer p-1 leading-none transition-colors hover:text-primary-900 dark:hover:text-primary-50"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-2 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                {stats.played}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">
                Played
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                {stats.winPercentage}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">
                Win %
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                {stats.currentStreak}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight">
                Current
                <br />
                Streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                {stats.maxStreak}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight">
                Max
                <br />
                Streak
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-primary-900 dark:text-primary-50 mb-4">
              Guess Distribution
            </h3>
            {[1, 2, 3, 4, 5, 6].map(guessNum => {
              const count = stats.guessDistribution[guessNum] || 0
              const hasValue = count > 0
              const scaledWidth = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0
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
                      className={`min-h-5 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end ${
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
          </div>
        </div>
      </div>
    </div>
  )
}
