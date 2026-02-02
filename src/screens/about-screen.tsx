interface Props {
  onBack: () => void
}

export default function AboutScreen({ onBack }: Props) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-5 max-w-sm mx-auto flex-1">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-wider text-primary-900 dark:text-primary-50">About</h2>
        <p className="text-xs text-primary-500 dark:text-primary-200 mt-1">{dateStr}</p>
      </div>

      <div className="w-full">
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">
          <strong>Playerdle</strong> is a daily guessing game for NFL fans. Test your knowledge by
          identifying players based on their conference, division, team, position, and jersey
          number.
        </p>
      </div>

      <div className="w-full">
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-6">Inspired by Wordle and other sports guessing games.</p>
      </div>

      <button
        className="mt-2 px-6 py-2 text-sm font-bold bg-success-500 dark:bg-success-400 text-primary-50 dark:text-primary-900 border-none rounded cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onBack}
      >
        Back to Menu
      </button>
    </div>
  )
}
