interface Props {
  onClick: () => void
}

export default function PlayAgainButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className="px-6 py-2.5 text-sm font-bold text-primary-50 dark:text-primary-900 bg-success-500 dark:bg-success-400 border-none rounded cursor-pointer uppercase hover:opacity-90 transition-opacity inline-flex items-center gap-2"
      title="Play again (Enter)"
      onClick={onClick}
    >
      Play Again
      <span
        aria-hidden="true"
        className="text-base leading-none opacity-80"
      >
        ↵
      </span>
    </button>
  )
}
