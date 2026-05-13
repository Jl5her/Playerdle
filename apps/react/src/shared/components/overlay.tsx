import clsx from "clsx"
import type { ReactNode } from "react"
import { useEscapeKey } from "@/shared/hooks/use-escape-key"

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

// Standard absolute-positioned crossfade overlay. Registers itself with the
// app-wide Escape stack so the top-most open overlay always handles Esc.
export default function Overlay({ open, onClose, children, className }: Props) {
  useEscapeKey(open, onClose)
  return (
    <div
      className={clsx(
        "crossfade-panel absolute inset-0",
        open ? "crossfade-active" : "crossfade-inactive",
        className,
      )}
    >
      {children}
    </div>
  )
}
