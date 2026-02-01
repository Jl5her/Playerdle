import type { CSSProperties } from "react"

interface Props {
  onClick: () => void
  children: React.ReactNode
  variant?: "primary" | "secondary"
  fullWidth?: boolean
  style?: CSSProperties
}

export default function Button({
  onClick,
  children,
  variant = "primary",
  fullWidth = false,
  style,
}: Props) {
  const baseClasses =
    "py-3.5 px-6 rounded-md text-base font-bold cursor-pointer transition-colors uppercase"
  let variantClasses = ""
  if (variant === "primary") {
    variantClasses =
      "bg-primary-500 text-primary-50 hover:bg-primary-400 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-100"
  } else {
    variantClasses =
      "bg-secondary-500 text-primary-50 border-2 border-secondary-700 hover:bg-secondary-400 dark:bg-secondary-50 dark:text-primary-900 dark:border-secondary-200 dark:hover:bg-secondary-100"
  }
  const widthClass = fullWidth ? "w-full" : ""

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${widthClass}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}
