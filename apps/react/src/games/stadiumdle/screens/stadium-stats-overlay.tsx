import {
  calculateStadiumStats,
  getStadiumHistory,
  type StadiumStats,
} from "@/games/stadiumdle/utils/stadium-daily"
import { CountUp, Panel, StatBar } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"
import { getTodayKey } from "@/shared/utils/time"

const MAX_GUESSES = 5

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
        <CountUp value={value} />
      </div>
      <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light leading-tight whitespace-pre-line">
        {label}
      </div>
    </div>
  )
}

function StadiumStatsBlock({
  stats,
  onViewArchive,
  highlightKey,
}: {
  stats: StadiumStats
  onViewArchive?: () => void
  highlightKey?: string
}) {
  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => ({
    key: String(i + 1),
    label: String(i + 1),
    count: stats.guessDistribution[i + 1] || 0,
    isLoss: false,
  }))

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-6">
        <Stat value={stats.played} label="Played" />
        <Stat value={stats.winPercentage} label="Win %" />
        <Stat value={stats.currentStreak} label={"Current\nStreak"} />
        <Stat value={stats.maxStreak} label={"Max\nStreak"} />
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
          Guess Distribution
        </h3>
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
      </div>

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
    </>
  )
}

export function StadiumStatsBody({
  className,
  onViewArchive,
}: {
  className?: string
  onViewArchive?: () => void
}) {
  const stats = calculateStadiumStats()
  const todayResult = getStadiumHistory().find(r => r.date === getTodayKey())
  const highlightKey = todayResult?.won ? String(todayResult.guesses) : undefined

  return (
    <div className={`text-center px-6 py-6 overflow-x-hidden ${className ?? ""}`}>
      <StadiumStatsBlock stats={stats} onViewArchive={onViewArchive} highlightKey={highlightKey} />
    </div>
  )
}

interface Props {
  id: string
  onViewArchive?: () => void
}

export default function StadiumStatsOverlay({ id, onViewArchive }: Props) {
  const ctx = usePanelContext()

  return (
    <Panel
      open={ctx?.isOpen(id) ?? false}
      onClose={() => ctx?.pop()}
      title="Statistics"
      layout="scroll"
    >
      <StadiumStatsBody onViewArchive={onViewArchive} />
    </Panel>
  )
}
