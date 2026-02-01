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
  const variantClasses =
    variant === "primary"
      ? "bg-accent-primary text-bg-primary hover:bg-accent-primary/90"
      : "bg-bg-secondary text-text-primary border-2 border-border hover:bg-bg-secondary/80"
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
