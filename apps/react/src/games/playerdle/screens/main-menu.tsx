import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { GameModeButton, MenuLinkButton, MenuOverlay, SyncPanel } from "@/shared/components"
import { AllStatsContent } from "@/games/playerdle/modals/all-stats-content"
import { GameGuideBody } from "@/games/playerdle/modals/game-guide-content"
import AboutSection from "@/games/playerdle/screens/about-section"
import type { SportConfig, SportInfo } from "@/games/playerdle/sports"
import { hasPlayedTodaysDaily } from "@/games/playerdle/utils/stats"

export type Screen =
  | "menu"
  | "daily"
  | "arcade"
  | "help"
  | "about"
  | "stats"
  | "all-stats"
  | "calendar"
  | "sync"

export interface NavigationOptions {
  variantId?: string
}

export interface ExtraGame {
  label: string
  played: boolean
  onPlayDaily: () => void
  onPlayArcade: () => void
  onShowStats: () => void
}

interface Props {
  onNavigate: (screen: Screen, options?: NavigationOptions) => void
  sport: SportInfo | SportConfig
  section: "menu" | "about" | "help" | "stats" | "sync"
  onCloseAbout: () => void
  guideSport?: SportConfig | null
  extraGames?: ExtraGame[]
}

export default function MainMenu({
  onNavigate,
  sport,
  section,
  onCloseAbout,
  guideSport,
  extraGames,
}: Props) {
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
  }

  const variantRows: VariantRow[] = [
    {
      variantLabel: "Playerdle",
      variantId: undefined,
      played: hasPlayedTodaysDaily(sport.id, undefined),
    },
    ...variants.map(variant => ({
      variantLabel: variant.label,
      variantId: variant.id,
      played: hasPlayedTodaysDaily(sport.id, variant.id),
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
          <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-end pb-4">
            <div className="flex flex-col gap-3 w-full">
              {variantRows.map(row => (
                <GameModeButton
                  key={`row:${row.variantId ?? "classic"}`}
                  label={row.variantLabel}
                  played={row.played}
                  onClick={() => onNavigate("daily", { variantId: row.variantId })}
                />
              ))}
              {extraGames?.map(game => (
                <GameModeButton
                  key={game.label}
                  label={game.label}
                  played={game.played}
                  onClick={game.onPlayDaily}
                />
              ))}
              <MenuLinkButton
                label="Stats"
                onClick={() => onNavigate("all-stats")}
                className="mt-3"
              />
              <MenuLinkButton
                label="Sync"
                onClick={() => onNavigate("sync")}
              />
              <MenuLinkButton
                label="About"
                onClick={() => onNavigate("about")}
              />
            </div>
          </div>
          <p className="text-xs text-primary-600 dark:text-primary-300 text-center pb-2">
            {dateStr}
          </p>
        </div>
        <AboutSection
          open={section === "about"}
          sport={sport}
          onClose={onCloseAbout}
        />
        <MenuOverlay
          open={section === "stats"}
          title="Statistics"
          onClose={onCloseAbout}
        >
          <AllStatsContent
            sport={sport}
            className="-mt-1 flex-1 overflow-auto pb-2"
          />
        </MenuOverlay>
        <MenuOverlay
          open={section === "help"}
          title="How to Play"
          onClose={onCloseAbout}
        >
          {guideSport ? (
            <GameGuideBody
              sport={guideSport}
              mode="manual"
              className="-mt-1 flex-1 overflow-auto pb-2"
            />
          ) : (
            <div className="-mt-1 flex-1" />
          )}
        </MenuOverlay>
        <MenuOverlay
          open={section === "sync"}
          title="Sync Devices"
          onClose={onCloseAbout}
        >
          <div className="-mt-1 flex-1 overflow-auto pb-2">
            <SyncPanel />
          </div>
        </MenuOverlay>
      </div>
    </div>
  )
}
