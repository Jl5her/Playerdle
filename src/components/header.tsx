interface Props {
  onShowTutorial?: () => void
  onBack?: () => void
  onShowSettings?: () => void
}

export default function Header({ onShowTutorial, onBack, onShowSettings }: Props) {
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
      <h1 className="text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">Playerdle</h1>
      <p className="text-[10px] text-primary-500 dark:text-primary-200 mt-0.5">{dateStr}</p>
      {onShowSettings && (
        <button
          onClick={onShowSettings}
          aria-label="Arcade settings"
          title="Arcade settings"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-2 border-primary-300 dark:border-primary-700 text-primary-500 dark:text-primary-200 cursor-pointer flex items-center justify-center transition-all text-base hover:text-primary-900 dark:hover:text-primary-50 w-8 h-8 rounded-full"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      )}
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
