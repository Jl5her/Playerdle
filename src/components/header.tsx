import type { SportInfo } from "@/sports"

interface Props {
  onShowTutorial?: () => void
  onBack?: () => void
  sport: SportInfo
}

export default function Header({ onShowTutorial, onBack, sport }: Props) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <header className="bg-primary-50 dark:bg-primary-900 px-4 py-2 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 text-xs font-semibold text-primary-900 dark:text-primary-50 bg-transparent border border-primary-300 dark:border-primary-700 rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-all"
        >
          Menu
        </button>
      )}
      <h1 className="text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">
        Playerdle {sport.displayName}
      </h1>
      <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">{dateStr}</p>
      {onShowTutorial && (
        <button
          onClick={onShowTutorial}
          aria-label="Show tutorial"
          title="How to play"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-2 border-primary-300 dark:border-primary-700 text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-all font-bold text-base hover:text-primary-900 dark:hover:text-primary-50 w-8 h-8 rounded-full"
        >
          ?
        </button>
      )}
    </header>
  )
}
