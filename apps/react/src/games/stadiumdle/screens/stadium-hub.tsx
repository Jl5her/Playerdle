import {
  faBuilding,
  faChartBar,
  faCircleInfo,
  faGear,
  faMap,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAllSportMeta, getSportIcon, type SportId } from "@/games/playerdle/sports"
import { StadiumStatsBody } from "@/games/stadiumdle/screens/stadium-stats-overlay"
import { hasPlayedStadiumDailyToday } from "@/games/stadiumdle/utils/stadium-daily"
import {
  AboutFooter,
  type FooterTab,
  GameModeButton,
  LeagueFooter,
  MenuOverlay,
  SettingsPanel,
  SyncPanel,
} from "@/shared/components"

type Section = "menu" | "about" | "stats" | "settings" | "sync-devices"

export default function StadiumHub() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>("menu")
  const playedToday = hasPlayedStadiumDailyToday()

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

  return (
    <>
      <div className="app-viewport pb-11 flex flex-col bg-primary-50 dark:bg-primary-900">
        <div className="flex flex-col items-center flex-1 w-full px-4 pt-8 pb-8">
          <div className="text-center">
            <div className="mb-4 text-primary-700 dark:text-primary-200 sport-title-icon-glitch">
              <FontAwesomeIcon icon={faBuilding} className="text-[3.4rem]" aria-hidden="true" />
            </div>
            <h1 className="fa5-title text-4xl font-black tracking-wide text-primary-700 dark:text-primary-50 sport-title-text-glitch">
              STADIUMDLE
            </h1>
            <p className="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-200 mt-2 sport-title-text-glitch">
              Can you name the state in 5 tries?
            </p>
          </div>

          <div className="w-full flex-1 mt-6 relative overflow-hidden">
            <div
              className={
                section === "menu"
                  ? "crossfade-panel crossfade-active h-full flex flex-col"
                  : "crossfade-panel crossfade-inactive h-full flex flex-col"
              }
            >
              <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-end pb-4">
                <div className="flex flex-col gap-3 w-full">
                  <GameModeButton
                    label="Daily"
                    played={playedToday}
                    onClick={() => navigate("/stadiumdle/daily")}
                  />
                  <GameModeButton
                    label="Arcade"
                    played={false}
                    onClick={() => navigate("/stadiumdle/arcade")}
                  />
                  <div className="flex justify-center gap-4 mt-3">
                    {(
                      [
                        { icon: faChartBar, label: "Stats", id: "stats" },
                        { icon: faCircleInfo, label: "About", id: "about" },
                        { icon: faGear, label: "Settings", id: "settings" },
                      ] as const
                    ).map(({ icon, label, id }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSection(id)}
                        aria-label={label}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 hover:text-primary-800 dark:hover:text-primary-100 transition-colors cursor-pointer"
                      >
                        <FontAwesomeIcon icon={icon} className="text-lg" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-300 text-center pb-2">
                {dateStr}
              </p>
            </div>

            <MenuOverlay open={section === "stats"} title="Statistics" onClose={goBack}>
              <StadiumStatsBody className="-mt-1 flex-1 overflow-y-auto overflow-x-hidden pb-2" />
            </MenuOverlay>

            <MenuOverlay open={section === "settings"} title="Settings" onClose={goBack}>
              <SettingsPanel onOpenSync={() => setSection("sync-devices")} />
            </MenuOverlay>

            <MenuOverlay open={section === "sync-devices"} title="Sync Devices" onClose={goBack}>
              <div className="-mt-1 flex-1 overflow-auto pb-2">
                <SyncPanel open={section === "sync-devices"} />
              </div>
            </MenuOverlay>

            <MenuOverlay
              open={section === "about"}
              title="About"
              onClose={goBack}
              closeAriaLabel="Close About"
            >
              <div className="-mt-1 flex-1 overflow-auto pb-2 flex flex-col">
                <div>
                  <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-3">
                    <strong>Stadiumdle</strong> is a daily geography puzzle: guess the U.S. state
                    from the names and seating capacities of its professional sports stadiums and
                    arenas.
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
                    Each wrong guess reveals an additional stadium from the same state. You have five
                    guesses.
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
                    Part of the Playerdle family. Inspired by Wordle and other guessing games.
                  </p>
                </div>
                <AboutFooter />
              </div>
            </MenuOverlay>
          </div>
        </div>
      </div>
      <LeagueFooter
        tabs={[
          ...getAllSportMeta().map<FooterTab>(sport => ({
            id: sport.id,
            icon: getSportIcon(sport.id),
            label: sport.displayName,
            active: false,
            onSelect: () => handleSelectSport(sport.id),
          })),
          {
            id: "statehue",
            icon: faMap,
            label: "Statehue",
            active: false,
            onSelect: () => navigate("/statehue"),
          },
          {
            id: "stadiumdle",
            icon: faBuilding,
            label: "Stadiums",
            active: true,
            onSelect: () => navigate("/stadiumdle"),
          },
        ]}
      />
    </>
  )
}
