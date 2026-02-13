import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleLeft, faChartSimple, faCircleQuestion } from "@fortawesome/free-solid-svg-icons"
import type { SportInfo } from "@/sports"

interface Props {
  onShowTutorial?: () => void
  onShowStats?: () => void
  onBack?: () => void
  sport: SportInfo
}

export default function Header({ onShowTutorial, onShowStats, onBack, sport }: Props) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <header className="bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back to menu"
          title="Back"
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary-900 dark:text-primary-50 bg-transparent rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-colors"
        >
          <FontAwesomeIcon
            icon={faAngleLeft}
            className="text-[1.7rem]"
            aria-hidden="true"
          />
        </button>
      )}
      <h1 className="fa5-title text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
        Playerdle {sport.displayName}
      </h1>
      <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">{dateStr}</p>
      {(onShowTutorial || onShowStats) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {onShowStats && (
            <button
              onClick={onShowStats}
              aria-label="Show stats"
              title="Stats"
              className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
            >
              <FontAwesomeIcon
                icon={faChartSimple}
                className="text-[1.15rem]"
                aria-hidden="true"
              />
            </button>
          )}
          {onShowTutorial && (
            <button
              onClick={onShowTutorial}
              aria-label="Show tutorial"
              title="How to play"
              className="p-2 bg-transparent text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-colors hover:text-primary-900 dark:hover:text-primary-50 rounded"
            >
              <FontAwesomeIcon
                icon={faCircleQuestion}
                className="text-[1.2rem]"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}
    </header>
  )
}
