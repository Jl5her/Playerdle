import { faChartColumn, faMap } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useNavigate } from "react-router-dom"
import { LeagueFooter } from "@/components"
import { type SportId } from "@/sports"
import { hasPlayedColorsDailyToday } from "@/utils/colors-daily"

type GameSlug = "statehue"

interface GameRow {
  slug: GameSlug
  label: string
  played: boolean
}

export default function PaletteHub() {
  const navigate = useNavigate()

  const rows: GameRow[] = [
    { slug: "statehue", label: "Statehue", played: hasPlayedColorsDailyToday() },
  ]

  function handleSelectSport(sportId: SportId) {
    if (sportId === "nfl") {
      navigate("/")
      return
    }
    navigate(`/${sportId}`)
  }

  function play(slug: GameSlug, mode: "daily" | "arcade") {
    navigate(`/${slug}/${mode}`)
  }

  function openStats(slug: GameSlug) {
    navigate(`/${slug}/daily`)
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

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
              GEO GAMES
            </h1>
            <p className="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-200 mt-2 sport-title-text-glitch">
              Pick a daily puzzle.
            </p>
          </div>

          <div className="w-full flex-1 mt-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-xs">
              <div className="flex flex-col gap-3">
                {rows.map(row => (
                  <div
                    key={row.slug}
                    className="min-w-44 mx-auto flex items-center gap-2"
                  >
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 rounded-full text-base font-bold transition-colors border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200 whitespace-nowrap"
                      onClick={() => play(row.slug, row.played ? "arcade" : "daily")}
                    >
                      {row.played ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span className="text-base">Arcade</span>
                          <span className="text-[10px] font-medium opacity-75 -mt-0.5">
                            {row.label}
                          </span>
                        </span>
                      ) : (
                        row.label
                      )}
                    </button>
                    {row.played && (
                      <button
                        type="button"
                        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                        aria-label={`${row.label} stats`}
                        title={`${row.label} stats`}
                        onClick={() => openStats(row.slug)}
                      >
                        <FontAwesomeIcon
                          icon={faChartColumn}
                          className="text-lg"
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-primary-600 dark:text-primary-300 text-center">{dateStr}</p>
        </div>
      </div>
      <LeagueFooter
        currentSportId="nfl"
        onSelectSport={handleSelectSport}
        colorsActive
        onSelectColors={() => navigate("/geo")}
      />
    </>
  )
}
