import { faChartColumn, faPalette } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

interface Props {
  onPlayDaily: () => void
  onPlayArcade: () => void
  onShowStats: () => void
  playedToday: boolean
}

const TITLE = "STATEHUE"
const SUBTITLE = "Guess the state from its team colors."

export default function ColorsMenu({
  onPlayDaily,
  onShowStats,
  playedToday,
}: Props) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="flex flex-col items-center flex-1 w-full px-4 pt-8 pb-8">
      <div className="text-center">
        <div className="mb-4 text-primary-700 dark:text-primary-200 sport-title-icon-glitch">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-[3.4rem]"
            aria-hidden="true"
          />
        </div>
        <h1 className="fa5-title text-4xl font-black tracking-wide text-primary-700 dark:text-primary-50 sport-title-text-glitch">
          {TITLE}
        </h1>
        <p className="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-200 mt-2 sport-title-text-glitch">
          {SUBTITLE}
        </p>
      </div>

      <div className="w-full flex-1 mt-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <div className="flex flex-col gap-3">
            <div className="min-w-44 mx-auto flex items-center gap-2">
              <button
                type="button"
                className={`flex-1 px-4 py-2 rounded-full text-base font-bold transition-colors whitespace-nowrap ${
                  playedToday
                    ? "border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
                    : "border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200"
                }`}
                onClick={onPlayDaily}
              >
                <span className="flex flex-col items-center justify-center leading-tight min-h-8">
                  <span className="text-base">Daily</span>
                  {playedToday && (
                    <span className="text-[10px] font-medium opacity-75 -mt-0.5">
                      Completed
                    </span>
                  )}
                </span>
              </button>
              {playedToday && (
                <button
                  type="button"
                  className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                  aria-label="Daily stats"
                  title="Daily stats"
                  onClick={onShowStats}
                >
                  <FontAwesomeIcon
                    icon={faChartColumn}
                    className="text-lg"
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-primary-600 dark:text-primary-300 text-center">
        {dateStr}
      </p>
    </div>
  )
}
