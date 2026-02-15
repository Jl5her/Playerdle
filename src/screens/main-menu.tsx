import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { GameGuideContent } from "@/modals/game-guide-content"
import AboutSection from "@/screens/about-section"
import type { SportConfig, SportInfo } from "@/sports"
import { hasBeatTodaysDaily } from "@/utils/stats"

export type Screen = "menu" | "daily" | "arcade" | "help" | "about" | "stats"

export interface NavigationOptions {
  variantId?: string
}

interface Props {
  onNavigate: (screen: Screen, options?: NavigationOptions) => void
  sport: SportInfo | SportConfig
  section: "menu" | "about" | "help"
  onCloseAbout: () => void
  guideSport?: SportConfig | null
}

export default function MainMenu({ onNavigate, sport, section, onCloseAbout, guideSport }: Props) {
  const variants = "variants" in sport ? (sport.variants ?? []) : []
  const dailyBeaten =
    hasBeatTodaysDaily(sport.id) ||
    variants.some(variant => hasBeatTodaysDaily(sport.id, variant.id))
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

  const menuItems: {
    label: string
    screen: Screen
    requireDaily?: boolean
    variantId?: string
  }[] = [
    {
      label: "Daily",
      screen: "daily",
    },
    ...variants.map(variant => ({
      label: variant.label,
      screen: "daily" as Screen,
      variantId: variant.id,
    })),
    {
      label: "Arcade",
      screen: "arcade",
    },
    { label: "About", screen: "about" },
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
          <div className="w-full max-w-xs mx-auto mt-auto mb-2">
            <div className="flex flex-col gap-3">
              {menuItems.map(item => {
                const isLocked = item.requireDaily && !dailyBeaten
                const isPrimaryAction =
                  item.label === "Daily" && item.screen === "daily" && !item.variantId

                const buttonClasses = isLocked
                  ? "border-none bg-primary-300 dark:bg-primary-800 text-primary-700 dark:text-primary-400 cursor-not-allowed opacity-70"
                  : isPrimaryAction
                    ? "border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200"
                    : "border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"

                return (
                  <button
                    key={`${item.screen}:${item.variantId ?? "classic"}`}
                    className={`mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors ${buttonClasses}`}
                    onClick={() =>
                      !isLocked && onNavigate(item.screen, { variantId: item.variantId })
                    }
                    disabled={isLocked}
                  >
                    {isLocked && "🔒 "}
                    {item.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-primary-600 dark:text-primary-300 text-center">
              {dateStr}
            </p>
          </div>
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
