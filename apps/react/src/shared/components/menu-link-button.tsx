interface Props {
  label: string
  onClick: () => void
  className?: string
  title?: string
}

export default function MenuLinkButton({ label, onClick, className = "", title }: Props) {
  return (
    <button
      type="button"
      className={`mx-auto w-fit min-w-44 px-6 py-3 rounded-full text-base font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 cursor-pointer hover:border-primary-600 dark:hover:border-primary-300 ${className}`}
      title={title ?? label}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
