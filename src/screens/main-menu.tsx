import { hasBeatTodaysDaily } from "@/utils/stats"
import type { SportConfig, SportInfo } from "@/sports"

export type Screen = "menu" | "daily" | "arcade" | "help" | "about" | "stats"

export interface NavigationOptions {
  variantId?: string
}

interface Props {
  onNavigate: (screen: Screen, options?: NavigationOptions) => void
  sport: SportInfo | SportConfig
}

export default function MainMenu({ onNavigate, sport }: Props) {
  const dailyBeaten = hasBeatTodaysDaily(sport.id) || hasBeatTodaysDaily(sport.id, "fanatic")
  const variants = "variants" in sport ? sport.variants ?? [] : []
  const fanaticVariant = variants.find(variant => variant.id === "fanatic")
  const menuItems: {
    label: string
    description: string
    screen: Screen
    requireDaily?: boolean
    variantId?: string
  }[] = [
    {
      label: "Daily",
      description: "Same player for everyone each day",
      screen: "daily",
    },
    ...(fanaticVariant
      ? [
          {
            label: fanaticVariant.label,
            description: "Season-average stat challenge",
            screen: "daily" as Screen,
            variantId: fanaticVariant.id,
          },
        ]
      : []),
    {
      label: "Arcade",
      description: "Random player every round",
      screen: "arcade",
      requireDaily: true,
    },
    { label: "About", description: "About Playerdle", screen: "about" },
  ]

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 gap-10">
      <div className="text-center">
        <h1 className="fa5-title text-4xl font-black tracking-widest text-primary-900 dark:text-primary-50">
          PLAYERDLE {sport.displayName}
        </h1>
        <p className="text-sm text-primary-500 dark:text-primary-200 mt-2">{sport.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {menuItems.map(item => {
          const isLocked = item.requireDaily && !dailyBeaten
          return (
            <button
              key={item.screen}
              className={`flex flex-col items-center px-4 py-4 rounded-lg border-2 ${
                isLocked
                  ? "border-primary-300 dark:border-primary-700 bg-primary-200 dark:bg-primary-800 text-primary-500 dark:text-primary-400 cursor-not-allowed opacity-70"
                  : "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 cursor-pointer hover:border-accent-500 dark:hover:border-accent-400"
              } transition-colors`}
              onClick={() => !isLocked && onNavigate(item.screen, { variantId: item.variantId })}
              disabled={isLocked}
            >
              <span className="text-lg font-bold">
                {isLocked && "🔒 "}
                {item.label}
              </span>
              <span
                className={`text-xs mt-1 ${isLocked ? "text-primary-600 dark:text-primary-400" : "text-primary-500 dark:text-primary-200"}`}
              >
                {isLocked ? "Beat today's daily to unlock" : item.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
