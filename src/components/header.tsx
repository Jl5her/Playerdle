interface Props {
  onShowTutorial?: () => void
}

export default function Header({ onShowTutorial }: Props) {
  return (
    <header className="bg-primary-50 dark:bg-primary-900 px-4 py-3 text-center shrink-0 border-b-2 border-primary-300 dark:border-primary-700 relative">
      <h1 className="text-xl font-black tracking-widest uppercase text-primary-900 dark:text-primary-50">Playerdle</h1>
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
