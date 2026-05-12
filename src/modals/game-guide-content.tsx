import type { SportConfig } from "@/sports"

export type GuideMode = "onboarding" | "manual"

interface GameGuideContentProps {
  sport: SportConfig
  mode: GuideMode
  className?: string
  onOpenCalendar?: () => void
}

export function GameGuideContent({
  sport,
  mode,
  className,
  onOpenCalendar,
}: GameGuideContentProps) {
  const isLocal = import.meta.env.DEV
  const isCompactLayout = sport.columns.length > 5
  const comparisonColumns = sport.columns.filter(
    column => column.evaluator.type === "comparison" && column.evaluator.closeWithin !== undefined,
  )

  function formatThreshold(value: number): string {
    if (Number.isInteger(value)) return String(value)
    if (value < 1) {
      return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
    }
    return value.toFixed(1).replace(/\.0$/, "")
  }

  function getExampleBg(status: "correct" | "close" | "incorrect"): string {
    if (status === "correct") return "bg-success-500 dark:bg-success-600"
    if (status === "close") return "bg-warning-500 dark:bg-warning-600"
    return "bg-error-500 dark:bg-error-600"
  }

  return (
    <div className={className}>
      <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
        Guess the mystery {sport.displayName} player in 6 tries. Each guess reveals clues across the
        columns shown below.
      </p>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-50 mb-3">
          Example
        </h3>
        <div
          className={`flex flex-col items-center ${isCompactLayout ? "guess-grid-compact" : ""}`}
        >
          <div className="flex gap-1 justify-center mb-1">
            {sport.columns.map(column => (
              <div
                key={column.id}
                className="grid-cell-width text-center text-xs font-bold tracking-wide uppercase text-primary-700 dark:text-primary-50"
              >
                {column.label}
              </div>
            ))}
          </div>
          <div className="flex gap-1 justify-center">
            {sport.columns.map(column => (
              <div
                key={column.id}
                className={`grid-cell-size flex items-center justify-center font-bold leading-tight p-1 rounded-md cursor-default text-primary-50 ${getExampleBg(column.example.status)}`}
              >
                {column.renderValue ? (
                  <div className="relative z-10 text-center leading-tight">
                    {column.renderValue(column.example.value)}
                    {column.example.arrow ? ` ${column.example.arrow}` : ""}
                  </div>
                ) : (
                  <span className="grid-cell-text text-center relative z-10">
                    {column.example.value}
                    {column.example.arrow ? ` ${column.example.arrow}` : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm shrink-0 bg-success-500 dark:bg-success-600" />
            <p className="text-primary-700 dark:text-primary-50 m-0 text-sm">
              Green = Correct match
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm shrink-0 bg-warning-500 dark:bg-warning-600" />
            <p className="text-primary-700 dark:text-primary-50 m-0 text-sm">
              Yellow = Close value for that specific column
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm shrink-0 bg-error-500 dark:bg-error-600" />
            <p className="text-primary-700 dark:text-primary-50 m-0 text-sm">Red = Incorrect</p>
          </div>
        </div>
      </div>

      {comparisonColumns.length > 0 && (
        <div className="mt-5">
          <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-50 mb-3">
            Close Thresholds
          </h3>
          <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2 text-sm">
            Thresholds are per column, not one shared value.
          </p>
          <div className="flex flex-col gap-1">
            {comparisonColumns.map(column => (
              <p
                key={column.id}
                className="text-primary-700 dark:text-primary-50 m-0 text-sm"
              >
                <strong>{column.label}</strong>: +/-
                {formatThreshold(
                  column.evaluator.type === "comparison" ? (column.evaluator.closeWithin ?? 0) : 0,
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2 text-sm">
          Arrows (↑ ↓) indicate if the mystery player's value is higher or lower.
        </p>
        {mode === "manual" && (
          <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2 text-sm">
            Daily uses the same player for everyone each day. Arcade gives random players.
          </p>
        )}
      </div>

      {isLocal && onOpenCalendar && (
        <div className="mt-6 pt-4 border-t border-primary-300 dark:border-primary-700 text-center">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-bold border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 rounded-full cursor-pointer hover:border-primary-600 dark:hover:border-primary-300 transition-colors uppercase"
            onClick={onOpenCalendar}
          >
            Open Calendar
          </button>
          <div className="mt-2 text-[10px] text-primary-400 dark:text-primary-600 uppercase tracking-wider">
            Local only
          </div>
        </div>
      )}
    </div>
  )
}
