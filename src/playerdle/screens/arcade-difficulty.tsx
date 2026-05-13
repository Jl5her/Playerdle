import type { ArcadeDifficulty } from "@/utils/daily"

interface Props {
  onSelect: (difficulty: ArcadeDifficulty) => void
  onBack: () => void
}

const difficulties: { level: ArcadeDifficulty; label: string; description: string }[] = [
  {
    level: "easy",
    label: "Easy",
    description: "QB, RB, WR, TE only",
  },
  {
    level: "medium",
    label: "Medium",
    description: "Adds CB, S, DT",
  },
  {
    level: "hard",
    label: "Hard",
    description: "All positions",
  },
]

export default function ArcadeDifficulty({ onSelect, onBack }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
      <h1 className="arcade-title-size font-black text-primary-900 dark:text-primary-50 mb-8 text-center">
        Select Difficulty
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {difficulties.map(({ level, label, description }) => (
          <button
            key={level}
            className="p-6 bg-secondary-50 dark:bg-secondary-900 border-2 border-secondary-300 dark:border-secondary-700 rounded-xl cursor-pointer transition-all text-left hover:border-accent-500 dark:hover:border-accent-400 hover:transform hover:scale-[1.02]"
            onClick={() => onSelect(level)}
          >
            <div className="text-xl font-bold text-primary-900 dark:text-primary-50 mb-2">
              {label}
            </div>
            <div className="text-sm text-primary-500 dark:text-primary-200">{description}</div>
          </button>
        ))}
      </div>
      <button
        className="absolute top-2.5 left-3 px-2.5 py-1.5 text-xs font-semibold text-primary-900 dark:text-primary-50 bg-transparent border border-primary-300 dark:border-primary-700 rounded cursor-pointer z-20 hover:bg-primary-900 hover:text-primary-50 dark:hover:bg-primary-50 dark:hover:text-primary-900 transition-all"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  )
}
