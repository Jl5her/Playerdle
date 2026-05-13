import clsx from "clsx"

interface Props {
  onClick: () => void
  children: React.ReactNode
  variant?: "primary" | "secondary" | "accent"
  fullWidth?: boolean
}

export default function Button({
  onClick,
  children,
  variant = "primary",
  fullWidth = false,
}: Props) {
  const variantClasses =
    variant === "primary"
      ? "bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200"
      : variant === "accent"
        ? "bg-accent-500 text-primary-50 hover:bg-accent-400 dark:bg-accent-400 dark:text-primary-900 dark:hover:bg-accent-300"
        : "bg-secondary-500 text-primary-50 hover:bg-secondary-400 dark:bg-secondary-50 dark:text-primary-900 dark:hover:bg-secondary-100"

  return (
    <button
      type="button"
      className={clsx(
        "py-3.5 px-6 rounded-md text-base font-bold cursor-pointer transition-colors uppercase",
        variantClasses,
        fullWidth && "w-full",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
