import {
  calculateJourneyStats,
  getJourneyHistory,
  type JourneyLeague,
} from "@/games/journeyman/utils/journey-daily"
import { CountUp, Panel, StatBar } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"
import { getTodayKey } from "@/shared/utils/time"

interface Props {
  id: string
  league: JourneyLeague
  onViewArchive?: () => void
}

export default function JourneyStatsOverlay({ id, league, onViewArchive }: Props) {
  const ctx = usePanelContext()
  const stats = calculateJourneyStats(league)
  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)
  const todayResult = getJourneyHistory(league).find(r => r.date === getTodayKey())
  const highlightKey = todayResult?.won ? String(todayResult.guesses) : undefined
  const rows: Array<{ key: string; label: string; count: number; isLoss: boolean }> = [
    ...[1, 2, 3, 4, 5].map(n => ({
      key: String(n),
      label: String(n),
      count: stats.guessDistribution[n] || 0,
      isLoss: false,
    })),
  ]

  return (
    <Panel
      open={ctx?.isOpen(id) ?? false}
      onClose={() => ctx?.pop()}
      title="Statistics"
      layout="scroll"
    >
      <div className="text-center px-6 py-6 overflow-x-hidden">
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
      </div>
    </Panel>
  )
}

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
