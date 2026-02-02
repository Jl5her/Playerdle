import { calculateStats } from "@/utils/stats"

interface Props {
  onClose: () => void
}

export default function StatsModal({ onClose }: Props) {
  const stats = calculateStats()
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
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-50 m-0">Statistics</h2>
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
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">{stats.played}</div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">Played</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">{stats.winPercentage}</div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">Win %</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">{stats.currentStreak}</div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">
                Current
                <br />
                Streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-50">{stats.maxStreak}</div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-snug">
                Max
                <br />
                Streak
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-primary-900 dark:text-primary-50 mb-4">Guess Distribution</h3>
            {[1, 2, 3, 4, 5, 6].map(guessNum => {
              const count = stats.guessDistribution[guessNum] || 0
              const percentage = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0

              return (
                <div
                  key={guessNum}
                  className="flex items-center mb-1 gap-2"
                >
                  <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">{guessNum}</div>
                  <div className="flex-1 relative">
                    <div
                      className="bg-primary-200 dark:bg-primary-800 rounded transition-all duration-300 inline-flex items-center"
                      style={{
                        width: `${Math.max(percentage, count > 0 ? 7 : 0)}%`,
                        minWidth: "2rem",
                        padding: "0.3rem 0.5rem",
                      }}
                    >
                      <span className="text-xs font-semibold text-primary-900 dark:text-primary-50">{count}</span>
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
