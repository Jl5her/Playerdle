import clsx from "clsx"

interface Props {
  label: string
  played: boolean
  inProgress?: boolean
  onClick: () => void
  title?: string
}

export default function GameModeButton({ label, played, inProgress, onClick, title }: Props) {
  const computedTitle =
    title ??
    (played
      ? `${label} — completed today`
      : inProgress
        ? `${label} — in progress`
        : `Play ${label}`)

  return (
    <button
      type="button"
      className={clsx(
        "mx-auto w-fit min-w-44 px-6 py-2 min-h-[2.75rem] flex items-center justify-center rounded-full text-base font-bold transition-colors whitespace-nowrap",
        played
          ? "border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300"
          : inProgress
            ? "border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-100 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300 bg-[repeating-linear-gradient(45deg,var(--color-primary-600)_0px,var(--color-primary-600)_6px,#fff_6px,#fff_12px)] dark:bg-[repeating-linear-gradient(45deg,var(--color-primary-300)_0px,var(--color-primary-300)_6px,var(--color-primary-900)_6px,var(--color-primary-900)_12px)]"
            : "border-none bg-primary-600 dark:bg-primary-300 text-primary-50 dark:text-primary-800 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-200",
      )}
      title={computedTitle}
      onClick={onClick}
    >
      <span className="flex flex-col items-center justify-center leading-tight">
        <span className="text-base">{label}</span>
        <span
          className={clsx(
            "text-[10px] font-medium -mt-0.5",
            !played && !inProgress && "hidden",
            played ? "opacity-75" : "opacity-90",
          )}
        >
          {played ? "Completed" : "In Progress"}
        </span>
      </span>
    </button>
  )
}
