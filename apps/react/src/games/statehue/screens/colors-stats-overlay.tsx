import clsx from "clsx"
import {
  type ColorsStats,
  type ColorsVariant,
  calculateColorsStats,
} from "@/games/statehue/utils/colors-daily"
import { Panel, StatsTabs, type StatsTab } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"

const MAX_GUESSES = 5

function ColorsStatsBlock({
  stats,
  onViewArchive,
}: {
  stats: ColorsStats
  onViewArchive?: () => void
}) {
  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), stats.losses, 1)
  const rows: Array<{ key: string; label: string; count: number; isLoss: boolean }> = [
    ...Array.from({ length: MAX_GUESSES }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1),
      count: stats.guessDistribution[i + 1] || 0,
      isLoss: false,
    })),
    { key: "X", label: "X", count: stats.losses, isLoss: true },
  ]

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
        {rows.map(row => {
          const has = row.count > 0
          const scaled = maxGuessCount > 0 ? (row.count / maxGuessCount) * 100 : 0
          const barWidth = row.count === 0 ? "2.25rem" : `${Math.max(scaled, 12)}%`
          const filledClass = row.isLoss
            ? "bg-error-500 dark:bg-error-400 text-primary-50 dark:text-primary-900"
            : "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
          return (
            <div key={row.key} className="flex items-center mb-1 gap-2">
              <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
                {row.label}
              </div>
              <div className="flex-1">
                <div
                  className={clsx(
                    "min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end",
                    has
                      ? filledClass
                      : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300",
                  )}
                  style={{ width: barWidth }}
                >
                  {row.count}
                </div>
              </div>
            </div>
          )
        })}
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

interface ColorsStatsBodyProps {
  variant?: ColorsVariant
  className?: string
  onViewArchive?: () => void
}

/** Single-variant stats body — used inside in-game overlays where the active variant is fixed. */
export function ColorsStatsBody({ variant = "pro", className, onViewArchive }: ColorsStatsBodyProps) {
  const stats = calculateColorsStats(variant)

  return (
    <div className={clsx("text-center px-6 py-6", className)}>
      <ColorsStatsBlock stats={stats} onViewArchive={onViewArchive} />
    </div>
  )
}

interface ColorsStatsTabbedBodyProps {
  className?: string
}

/** Tabbed stats body — shows Statehue and Collegiate side-by-side as tabs. */
export function ColorsStatsTabbedBody({ className }: ColorsStatsTabbedBodyProps) {
  const tabs: StatsTab[] = [
    {
      id: "pro",
      label: "Statehue",
      content: (
        <div className="text-center pt-2 pb-6 px-2">
          <ColorsStatsBlock stats={calculateColorsStats("pro")} />
        </div>
      ),
    },
    {
      id: "collegiate",
      label: "Collegiate",
      content: (
        <div className="text-center pt-2 pb-6 px-2">
          <ColorsStatsBlock stats={calculateColorsStats("collegiate")} />
        </div>
      ),
    },
  ]

  return (
    <StatsTabs
      tabs={tabs}
      className={className}
      ariaLabel="Statehue stats"
    />
  )
}

interface Props {
  id: string
  variant?: ColorsVariant
  onViewArchive?: () => void
}

/** Self-contained panel — reads open state from PanelStackContext. */
export default function ColorsStatsOverlay({ id, variant = "pro", onViewArchive }: Props) {
  const ctx = usePanelContext()

  return (
    <Panel open={ctx?.isOpen(id) ?? false} onClose={() => ctx?.pop()} title="Statistics" layout="scroll">
      <ColorsStatsBody variant={variant} onViewArchive={onViewArchive} />
    </Panel>
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
