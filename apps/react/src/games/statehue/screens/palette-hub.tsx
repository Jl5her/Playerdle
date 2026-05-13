import { faMap } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAllSportMeta, getSportIcon, type SportId } from "@/games/playerdle/sports"
import ColorsStatsOverlay from "@/games/statehue/screens/colors-stats-overlay"
import { hasPlayedColorsDailyToday } from "@/games/statehue/utils/colors-daily"
import {
  AboutFooter,
  type FooterTab,
  GameModeButton,
  LeagueFooter,
  MenuLinkButton,
  MenuOverlay,
} from "@/shared/components"

type Section = "menu" | "about" | "stats"

export default function PaletteHub() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>("menu")
  const playedToday = hasPlayedColorsDailyToday()
  const playedCollegiateToday = hasPlayedColorsDailyToday("collegiate")

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
              Can you name the state in 5 tries?
            </p>
          </div>

          <div className="w-full flex-1 mt-6 relative overflow-hidden">
            <div
              className={clsx(
                "crossfade-panel h-full flex flex-col",
                section === "menu" ? "crossfade-active" : "crossfade-inactive",
              )}
            >
              <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-end pb-4">
                <div className="flex flex-col gap-3 w-full">
                  <GameModeButton
                    label="Statehue"
                    played={playedToday}
                    onClick={() => navigate("/statehue/daily")}
                  />
                  <GameModeButton
                    label="Collegiate"
                    played={playedCollegiateToday}
                    onClick={() => navigate("/statehue/collegiate")}
                  />
                  <MenuLinkButton
                    label="Stats"
                    onClick={() => setSection("stats")}
                    className="mt-3"
                  />
                  <MenuLinkButton
                    label="About"
                    onClick={() => setSection("about")}
                  />
                </div>
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-300 text-center pb-2">
                {dateStr}
              </p>
            </div>

            <MenuOverlay
              open={section === "stats"}
              title="Statistics"
              onClose={goBack}
            >
              <ColorsStatsOverlay className="-mt-1 flex-1 overflow-auto pb-2" />
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
                    <strong>Statehue</strong> is a daily geography puzzle: guess the state from the
                    team colors of its pro and college sports teams.
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
                    Each wrong guess reveals an additional team's colors. You have five guesses.
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
            active: true,
            onSelect: () => navigate("/statehue"),
          },
        ]}
      />
    </>
  )
}
