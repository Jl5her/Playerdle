import type { ReactNode } from "react"
import type { SportConfig, SportInfo, SportVariant } from "@/sports"
import { calculateStats } from "@/utils/stats"

interface AllStatsContentProps {
  sport: SportConfig | SportInfo
  className?: string
}

interface VariantEntry {
  label: string
  variantId?: string
}

function VariantStatsBlock({
  sportId,
  variantId,
  label,
}: {
  sportId: string
  variantId?: string
  label: string
}) {
  const stats = calculateStats(sportId, variantId)
  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)

  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase text-left tracking-wider">
        {label}
      </h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Tile value={stats.played} label="Played" />
        <Tile value={stats.winPercentage} label="Win %" />
        <Tile value={stats.currentStreak} label={<>Current<br />Streak</>} />
        <Tile value={stats.maxStreak} label={<>Max<br />Streak</>} />
      </div>
      <h4 className="text-xs font-semibold text-primary-700 dark:text-primary-200 mb-2 uppercase text-left tracking-wide">
        Guess Distribution
      </h4>
      {[1, 2, 3, 4, 5, 6].map(guessNum => {
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

export function AllStatsContent({ sport, className }: AllStatsContentProps) {
  const variants =
    "variants" in sport && Array.isArray(sport.variants) ? (sport.variants as SportVariant[]) : []
  const entries: VariantEntry[] = [
    { label: "Daily" },
    ...variants.map(v => ({ label: v.label, variantId: v.id })),
  ]

  return (
    <div className={className}>
      {entries.map(entry => (
        <VariantStatsBlock
          key={entry.variantId ?? "classic"}
          sportId={sport.id}
          variantId={entry.variantId}
          label={entry.label}
        />
      ))}
    </div>
  )
}
