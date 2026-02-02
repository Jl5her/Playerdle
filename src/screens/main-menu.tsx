export type Screen = "menu" | "daily" | "arcade" | "help" | "about" | "stats" | "behind"

interface Props {
  onNavigate: (screen: Screen) => void
}

const menuItems: { label: string; description: string; screen: Screen }[] = [
  { label: "Daily", description: "Same player for everyone each day", screen: "daily" },
  { label: "Arcade", description: "Random player every round", screen: "arcade" },
  { label: "About", description: "About Playerdle", screen: "about" },
  import.meta.env.DEV && { label: "Behind the Scenes (Dev)", description: "See how the daily player is chosen", screen: "behind" },
].filter(Boolean) as { label: string; description: string; screen: Screen }[]

export default function MainMenu({ onNavigate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 gap-10">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-widest text-primary-900 dark:text-primary-50">PLAYERDLE</h1>
        <p className="text-sm text-primary-500 dark:text-primary-200 mt-2">Guess the NFL player in 5 tries</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {menuItems.map(item => (
          <button
            key={item.screen}
            className="flex flex-col items-center px-4 py-4 rounded-lg border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 cursor-pointer transition-colors hover:border-accent-500 dark:hover:border-accent-400"
            onClick={() => onNavigate(item.screen)}
          >
            <span className="text-lg font-bold">{item.label}</span>
            <span className="text-xs text-primary-500 dark:text-primary-200 mt-1">{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
