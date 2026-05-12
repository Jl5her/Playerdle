import {
  faBaseball,
  faBasketball,
  faChartColumn,
  faFootball,
  faHockeyPuck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { AllStatsContent } from "@/modals/all-stats-content"
import { GameGuideContent } from "@/modals/game-guide-content"
import AboutSection from "@/screens/about-section"
import type { SportConfig, SportInfo } from "@/sports"
import { hasPlayedTodaysDaily } from "@/utils/stats"

export type Screen =
  | "menu"
  | "daily"
  | "arcade"
  | "help"
  | "about"
  | "stats"
  | "all-stats"
  | "calendar"

export interface NavigationOptions {
  variantId?: string
}

interface Props {
  onNavigate: (screen: Screen, options?: NavigationOptions) => void
  sport: SportInfo | SportConfig
  section: "menu" | "about" | "help" | "stats"
  onCloseAbout: () => void
  guideSport?: SportConfig | null
}

export default function MainMenu({ onNavigate, sport, section, onCloseAbout, guideSport }: Props) {
  const variants = "variants" in sport ? (sport.variants ?? []) : []
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function withEndingPunctuation(value: string): string {
    return /[.!?]$/.test(value.trim()) ? value : `${value}.`
  }

  function getSportIcon() {
    if (sport.id === "nfl") return faFootball
    if (sport.id === "mlb") return faBaseball
    if (sport.id === "nhl") return faHockeyPuck
    return faBasketball
  }

  type VariantRow = {
    variantLabel: string
    variantId?: string
    played: boolean
    isPrimary: boolean
  }

  const variantRows: VariantRow[] = [
    {
      variantLabel: "Daily",
      variantId: undefined,
      played: hasPlayedTodaysDaily(sport.id, undefined),
      isPrimary: true,
    },
    ...variants.map(variant => ({
      variantLabel: variant.label,
      variantId: variant.id,
      played: hasPlayedTodaysDaily(sport.id, variant.id),
      isPrimary: false,
    })),
  ]

  return (
    <div className="flex flex-col items-center flex-1 w-full px-4 pt-8 pb-8">
      <div className="text-center">
        <div
          key={`sport-icon-${sport.id}`}
          className="mb-4 text-primary-700 dark:text-primary-200 sport-title-icon-glitch"
        >
          <FontAwesomeIcon
            icon={getSportIcon()}
            className="text-[3.4rem]"
            aria-hidden="true"
          />
        </div>
        <h1
          key={`sport-title-${sport.id}`}
          className="fa5-title text-4xl font-black tracking-wide text-primary-700 dark:text-primary-50 sport-title-text-glitch"
        >
          PLAYERDLE {sport.displayName}
        </h1>
        <p
          key={`sport-subtitle-${sport.id}`}
          className="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-200 mt-2 sport-title-text-glitch"
        >
          {withEndingPunctuation(sport.subtitle)}
        </p>
      </div>

      <div className="w-full flex-1 mt-6 relative overflow-hidden">
        <div
          className={`crossfade-panel h-full flex flex-col ${section === "menu" ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col gap-3 w-full">
              {variantRows.map(row => {
                const targetScreen: Screen = row.played ? "arcade" : "daily"
                const buttonClasses = row.isPrimary
                  ? "border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200"
                  : "border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"

                return (
                  <div
                    key={`row:${row.variantId ?? "classic"}`}
                    className="min-w-44 mx-auto flex items-center gap-2"
                  >
                    <button
                      className={`flex-1 px-4 py-2 rounded-full text-base font-bold transition-colors whitespace-nowrap ${buttonClasses}`}
                      onClick={() => onNavigate(targetScreen, { variantId: row.variantId })}
                    >
                      {row.played ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span className="text-base">Arcade</span>
                          <span className="text-[10px] font-medium opacity-75 -mt-0.5">
                            {row.variantLabel}
                          </span>
                        </span>
                      ) : (
                        row.variantLabel
                      )}
                    </button>
                    {row.played && (
                      <button
                        type="button"
                        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                        aria-label={`${row.variantLabel} stats`}
                        title={`${row.variantLabel} stats`}
                        onClick={() => onNavigate("stats", { variantId: row.variantId })}
                      >
                        <FontAwesomeIcon
                          icon={faChartColumn}
                          className="text-lg"
                        />
                      </button>
                    )}
                  </div>
                )
              })}
              <button
                className="mt-3 mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
                onClick={() => onNavigate("all-stats")}
              >
                Stats
              </button>
              <button
                className="mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
                onClick={() => onNavigate("about")}
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
          className={`crossfade-panel absolute inset-0 ${section === "about" ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <AboutSection
            sport={sport}
            onClose={onCloseAbout}
          />
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
                onClick={onCloseAbout}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-2xl"
                />
              </button>
            </div>
            <AllStatsContent
              sport={sport}
              className="-mt-1 flex-1 overflow-auto pb-2"
            />
          </div>
        </div>
        <div
          className={`crossfade-panel absolute inset-0 ${section === "help" ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <div className="w-full max-w-sm mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                How to Play
              </h2>
              <button
                type="button"
                className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                aria-label="Close guide"
                onClick={onCloseAbout}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-2xl"
                />
              </button>
            </div>
            {guideSport ? (
              <GameGuideContent
                sport={guideSport}
                mode="manual"
                className="-mt-1 flex-1 overflow-auto pb-2"
              />
            ) : (
              <div className="-mt-1 flex-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
