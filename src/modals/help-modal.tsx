import type { SportConfig } from "@/sports"

interface Props {
  onBack: () => void
  sport: SportConfig
}

export default function HelpModal({ onBack, sport }: Props) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-5 max-w-sm mx-auto overflow-y-auto flex-1">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-wider text-primary-900 dark:text-primary-50">How to Play</h2>
        <p className="text-xs text-primary-500 dark:text-primary-200 mt-1">{dateStr}</p>
      </div>

      <div className="w-full flex flex-col gap-1">
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          Guess the {sport.displayName} player in <strong>6 tries</strong>. After each guess, the tiles will change
          color to show how close your guess was.
        </p>
      </div>

      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-5 h-5 rounded bg-success-500 dark:bg-success-400 shrink-0" />
          <span className="text-sm text-primary-500 dark:text-primary-200 leading-6">Exact match</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-5 h-5 rounded bg-warning-500 dark:bg-warning-400 shrink-0" />
          <span className="text-sm text-primary-500 dark:text-primary-200 leading-6">Close value</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-5 h-5 rounded bg-error-500 dark:bg-error-400 shrink-0" />
          <span className="text-sm text-primary-500 dark:text-primary-200 leading-6">No match</span>
        </div>
      </div>

      <div className="w-full flex flex-col gap-1">
        <h3 className="text-base font-bold text-primary-900 dark:text-primary-50 mb-1">Categories</h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          Each guess reveals clues across the categories shown in the grid.
        </p>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          For jersey number, an arrow indicates whether the answer's number is higher or lower.
        </p>
      </div>

      <div className="w-full flex flex-col gap-1">
        <h3 className="text-base font-bold text-primary-900 dark:text-primary-50 mb-1">Game Modes</h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          <strong>Daily</strong> &mdash; Everyone gets the same {sport.displayName} player each day (midnight reset).
        </p>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          <strong>Arcade</strong> &mdash; Play unlimited rounds with a random player each time.
        </p>
      </div>

      <button
        className="mt-2 px-6 py-2 text-sm font-bold bg-success-500 dark:bg-success-400 text-primary-50 dark:text-primary-900 border-none rounded cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onBack}
      >
        Back to Menu
      </button>
    </div>
  )
}
