import { faMap, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LeagueFooter } from "@/components"
import ColorsStatsOverlay from "@/screens/colors-stats-overlay"
import { type SportId } from "@/sports"
import { hasPlayedColorsDailyToday } from "@/utils/colors-daily"

type Section = "menu" | "about" | "stats"

function PaletteAbout({ onClose }: { onClose: () => void }) {
  const commitShortSha = __BUILD_COMMIT_SHORT_SHA__
  const commitUrl = __BUILD_COMMIT_URL__
  const repoUrl = "https://github.com/Jl5her/Playerdle"
  const footerLinkClasses =
    "inline-flex items-center underline decoration-primary-500 underline-offset-4 text-primary-700 dark:text-primary-100 md:hover:text-primary-900 dark:md:hover:text-primary-50 md:hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-primary-900 rounded-sm transition-all duration-150"

  return (
    <div className="w-full max-w-sm mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
          About
        </h2>
        <button
          type="button"
          className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
          aria-label="Close About"
          onClick={onClose}
        >
          <FontAwesomeIcon
            icon={faXmark}
            className="text-2xl"
          />
        </button>
      </div>
      <div className="-mt-1 flex-1 overflow-auto pb-2 flex flex-col">
        <div>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-3">
            <strong>Statehue</strong> is a daily geography puzzle: guess the state from the team
            colors of its pro and college sports teams.
          </p>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
            Each wrong guess reveals an additional team's colors. You have five guesses.
          </p>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
            Part of the Playerdle family. Inspired by Wordle and other guessing games.
          </p>
        </div>

        <div className="mt-auto pt-6 text-center">
          <p className="text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
            Author
          </p>
          <p className="mt-1 text-sm">
            <a
              className={footerLinkClasses}
              href="https://jackp.me"
              target="_blank"
              rel="noreferrer"
            >
              Jack Pfeiffer
            </a>
          </p>

          <p className="mt-4 text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
            Commit
          </p>
          <p className="mt-1 text-sm">
            {commitShortSha ? (
              commitUrl ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClasses}
                >
                  {commitShortSha}
                </a>
              ) : (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClasses}
                >
                  {commitShortSha}
                </a>
              )
            ) : (
              <span className="text-primary-500 dark:text-primary-300">Unavailable</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaletteHub() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>("menu")
  const playedToday = hasPlayedColorsDailyToday()

  function handleSelectSport(sportId: SportId) {
    if (sportId === "nfl") {
      navigate("/")
      return
    }
    navigate(`/${sportId}`)
  }

  function goBack() {
    setSection("menu")
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const playedButtonClasses = playedToday
    ? "border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
    : "border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200"

  return (
    <>
      <div className="app-viewport pb-11 flex flex-col bg-primary-50 dark:bg-primary-900">
        <div className="flex flex-col items-center flex-1 w-full px-4 pt-8 pb-8">
          <div className="text-center">
            <div className="mb-4 text-primary-700 dark:text-primary-200 sport-title-icon-glitch">
              <FontAwesomeIcon
                icon={faMap}
                className="text-[3.4rem]"
                aria-hidden="true"
              />
            </div>
            <h1 className="fa5-title text-4xl font-black tracking-wide text-primary-700 dark:text-primary-50 sport-title-text-glitch">
              STATEHUE
            </h1>
            <p className="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-200 mt-2 sport-title-text-glitch">
              Pick a daily puzzle.
            </p>
          </div>

          <div className="w-full flex-1 mt-6 relative overflow-hidden">
            <div
              className={`crossfade-panel h-full flex flex-col ${section === "menu" ? "crossfade-active" : "crossfade-inactive"}`}
            >
              <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-end pb-4">
                <div className="flex flex-col gap-3 w-full">
                  <button
                    type="button"
                    className={`mx-auto w-fit min-w-44 px-6 py-2 rounded-full text-base font-bold transition-colors whitespace-nowrap ${playedButtonClasses}`}
                    onClick={() => navigate("/statehue/daily")}
                  >
                    <span className="flex flex-col items-center justify-center leading-tight min-h-8">
                      <span className="text-base">Statehue</span>
                      {playedToday && (
                        <span className="text-[10px] font-medium opacity-75 -mt-0.5">
                          Completed
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    className="mt-3 mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
                    onClick={() => setSection("stats")}
                  >
                    Stats
                  </button>
                  <button
                    className="mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
                    onClick={() => setSection("about")}
                  >
                    About
                  </button>
                </div>
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-300 text-center pb-2">
                {dateStr}
              </p>
            </div>

            <div
              className={`crossfade-panel absolute inset-0 ${section === "stats" ? "crossfade-active" : "crossfade-inactive"}`}
            >
              <div className="w-full max-w-sm mx-auto h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                    Statistics
                  </h2>
                  <button
                    type="button"
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                    aria-label="Close stats"
                    onClick={goBack}
                  >
                    <FontAwesomeIcon
                      icon={faXmark}
                      className="text-2xl"
                    />
                  </button>
                </div>
                <ColorsStatsOverlay className="-mt-1 flex-1 overflow-auto pb-2" />
              </div>
            </div>

            <div
              className={`crossfade-panel absolute inset-0 ${section === "about" ? "crossfade-active" : "crossfade-inactive"}`}
            >
              <PaletteAbout onClose={goBack} />
            </div>
          </div>
        </div>
      </div>
      <LeagueFooter
        currentSportId="nfl"
        onSelectSport={handleSelectSport}
        colorsActive
        onSelectColors={() => navigate("/statehue")}
      />
    </>
  )
}
