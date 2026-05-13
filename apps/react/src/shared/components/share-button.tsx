interface Props {
  onClick: () => void
  copied: boolean
}

export default function ShareButton({ onClick, copied }: Props) {
  return (
    <button
      type="button"
      className="px-6 py-2.5 text-sm font-bold text-primary-700 dark:text-primary-50 bg-primary-200 dark:bg-primary-800 border-none rounded cursor-pointer flex items-center gap-2 uppercase hover:bg-primary-300 dark:hover:bg-primary-700 transition-colors"
      title="Share results"
      onClick={onClick}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line
          x1="12"
          y1="2"
          x2="12"
          y2="15"
        />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
  )
}
