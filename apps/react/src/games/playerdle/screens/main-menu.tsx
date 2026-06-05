import {
  faBaseball,
  faBasketball,
  faChartBar,
  faCircleInfo,
  faFootball,
  faGear,
  faHockeyPuck,
} from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { GameModeButton, MenuOverlay, SettingsPanel } from "@/shared/components"
import SyncPanel from "@/shared/components/sync-panel"
import type { JourneyLeague } from "@/games/journeyman/utils/journey-daily"
import { AllStatsContent } from "@/games/playerdle/modals/all-stats-content"
import { GameGuideBody } from "@/games/playerdle/modals/game-guide-content"
import AboutSection from "@/games/playerdle/screens/about-section"
import type { SportConfig, SportInfo } from "@/games/playerdle/sports"
import { hasPlayedTodaysDaily, isInProgressTodaysDaily } from "@/games/playerdle/utils/stats"
import { useMenuStack } from "@/shared/hooks/use-menu-stack"

export type Screen =
  | "menu"
  | "daily"
  | "arcade"
  | "help"
  | "about"
  | "stats"
  | "all-stats"
  | "calendar"
  | "settings"

export interface NavigationOptions {
  variantId?: string
}

export interface ExtraGame {
  label: string
  description?: string
  icon?: IconDefinition
  /** If true, renders as a direct button on the main menu instead of inside More Games */
  featured?: boolean
  played: boolean
  inProgress?: boolean
  onPlayDaily: () => void
  onPlayArcade: () => void
  onShowStats: () => void
}

interface Props {
  onNavigate: (screen: Screen, options?: NavigationOptions) => void
  sport: SportInfo | SportConfig
  guideSport?: SportConfig | null
  extraGames?: ExtraGame[]
  journeyLeague?: JourneyLeague | null
}

export default function MainMenu({
  onNavigate,
  sport,
  guideSport,
  extraGames,
  journeyLeague,
}: Props) {
  const { push, pop, popAll, peek } = useMenuStack()
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
    inProgress: boolean
  }

  const variantRows: VariantRow[] = [
    {
      variantLabel: "Playerdle",
      variantId: undefined,
      played: hasPlayedTodaysDaily(sport.id, undefined),
      inProgress: isInProgressTodaysDaily(sport.id, undefined),
    },
    ...variants.map(variant => ({
      variantLabel: variant.label,
      variantId: variant.id,
      played: hasPlayedTodaysDaily(sport.id, variant.id),
      inProgress: isInProgressTodaysDaily(sport.id, variant.id),
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
          className={`crossfade-panel h-full flex flex-col ${peek === null ? "crossfade-active" : "crossfade-inactive"}`}
        >
          <div className="w-full max-w-xs mx-auto flex-1 flex flex-col items-center justify-end pb-4">
            <div className="flex flex-col gap-3 w-full">
              {variantRows.map(row => (
                <GameModeButton
                  key={`row:${row.variantId ?? "classic"}`}
                  label={row.variantLabel}
                  played={row.played}
                  inProgress={row.inProgress}
                  onClick={() => onNavigate("daily", { variantId: row.variantId })}
                />
              ))}
              {extraGames
                ?.filter(g => g.featured)
                .map(game => (
                  <GameModeButton
                    key={game.label}
                    label={game.label}
                    played={game.played}
                    inProgress={game.inProgress}
                    onClick={game.onPlayDaily}
                  />
                ))}
              {extraGames?.some(g => !g.featured) && (
                <GameModeButton
                  label="More Games"
                  played={extraGames!.filter(g => !g.featured).every(g => g.played)}
                  inProgress={
                    !extraGames!.filter(g => !g.featured).every(g => g.played) &&
                    extraGames!.filter(g => !g.featured).some(g => g.inProgress)
                  }
                  onClick={() => push("more-games")}
                />
              )}
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
                    onClick={() => push(id)}
                    aria-label={label}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 hover:text-primary-800 dark:hover:text-primary-100 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      className="text-lg"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-primary-600 dark:text-primary-300 text-center pb-2">
            {dateStr}
          </p>
        </div>
        <AboutSection
          open={peek === "about"}
          sport={sport}
          onClose={popAll}
        />
        <MenuOverlay
          open={peek === "stats"}
          title="Statistics"
          onClose={popAll}
        >
          <AllStatsContent
            sport={sport}
            journeyLeague={journeyLeague}
            className="-mt-1 flex-1 overflow-y-auto overflow-x-hidden pb-2"
          />
        </MenuOverlay>
        <MenuOverlay
          open={peek === "help"}
          title="How to Play"
          onClose={popAll}
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
          open={peek === "more-games"}
          title="More Games"
          onClose={popAll}
          onBack={pop}
        >
          <div className="-mt-1 flex-1 overflow-y-auto pb-4 flex flex-col gap-3 pt-4">
            {extraGames
              ?.filter(g => !g.featured)
              .map(game => (
                <button
                  key={game.label}
                  type="button"
                  onClick={game.onPlayDaily}
                  className={clsx(
                    "w-full text-left rounded-2xl border-2 flex items-center gap-3 transition-colors cursor-pointer",
                    game.played
                      ? "p-4 border-primary-300 dark:border-primary-600 bg-transparent hover:border-primary-500 dark:hover:border-primary-400"
                      : game.inProgress
                        ? "p-2 border-primary-400 dark:border-primary-500 bg-[repeating-linear-gradient(45deg,var(--color-primary-600)_0px,var(--color-primary-600)_6px,var(--color-primary-300)_6px,var(--color-primary-300)_12px)] dark:bg-[repeating-linear-gradient(45deg,var(--color-primary-400)_0px,var(--color-primary-400)_6px,var(--color-primary-200)_6px,var(--color-primary-200)_12px)] hover:border-primary-600 dark:hover:border-primary-300"
                        : "p-4 border-transparent bg-primary-600 dark:bg-primary-300 hover:bg-primary-700 dark:hover:bg-primary-200",
                  )}
                >
                  <div
                    className={clsx(
                      "shrink-0 w-11 h-11 rounded-full flex items-center justify-center",
                      game.played || game.inProgress
                        ? "bg-primary-50 dark:bg-primary-900"
                        : "bg-white/20 dark:bg-black/15",
                    )}
                  >
                    <FontAwesomeIcon
                      icon={game.icon!}
                      className={clsx(
                        "text-xl",
                        game.played
                          ? "text-primary-600 dark:text-primary-200"
                          : game.inProgress
                            ? "text-primary-600 dark:text-primary-300"
                            : "text-white dark:text-primary-800",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div
                    className={clsx(
                      "flex-1 min-w-0 rounded-xl px-3 py-1.5",
                      game.played || game.inProgress
                        ? "bg-primary-50 dark:bg-primary-900"
                        : "bg-white/10 dark:bg-black/10",
                    )}
                  >
                    <div
                      className={clsx(
                        "font-bold text-sm leading-tight",
                        game.played
                          ? "text-primary-800 dark:text-primary-100"
                          : game.inProgress
                            ? "text-primary-700 dark:text-primary-100"
                            : "text-white dark:text-primary-800",
                      )}
                    >
                      {game.label}
                    </div>
                    <div
                      className={clsx(
                        "text-xs mt-0.5 leading-snug",
                        game.played
                          ? "text-primary-500 dark:text-primary-400"
                          : game.inProgress
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-white/80 dark:text-primary-700",
                      )}
                    >
                      {game.description}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </MenuOverlay>
        <MenuOverlay
          open={peek === "settings"}
          title="Settings"
          onClose={popAll}
        >
          <SettingsPanel onOpenSync={() => push("sync")} />
        </MenuOverlay>
        <MenuOverlay
          open={peek === "sync"}
          title="Sync Devices"
          onClose={pop}
          onBack={pop}
        >
          <div
            className="-mt-1 flex-1 overflow-auto pb-32"
            style={{ scrollPaddingBottom: "8rem" }}
          >
            <SyncPanel open={peek === "sync"} />
          </div>
        </MenuOverlay>
      </div>
    </div>
  )
}
