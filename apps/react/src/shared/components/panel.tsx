import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import type { ReactNode } from "react"
import { useEscapeKey } from "@/shared/hooks/use-escape-key"

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  /**
   * Content layout variant:
   * - undefined (default): constrained flex column with internal scroll — for How to Play
   * - "scroll": auto-overflow container — for Stats / Results overlays
   * - "full": no wrapper, content owns its layout — for Calendar and game results
   */
  layout?: "scroll" | "full"
  children: ReactNode
}

export default function Panel({ open, onClose, title = "Results", layout, children }: Props) {
  useEscapeKey(open, onClose)
  return (
    <div
      className={clsx(
        "slide-up-panel absolute inset-0 flex flex-col bg-primary-50 dark:bg-primary-900",
        // Desktop: become a centered-modal wrapper with a translucent backdrop and equal top/bottom margins.
        "md:items-center md:justify-center md:p-6 md:bg-primary-900/40 md:dark:bg-black/50 md:backdrop-blur-sm",
        open ? "slide-up-active" : "slide-up-inactive",
      )}
    >
      {/* Click-outside dismiss area — sits behind the modal card on desktop only. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="hidden md:block absolute inset-0"
      />
      <div
        className={clsx(
          "relative flex flex-col flex-1 min-h-0 w-full",
          // Desktop: size to viewport with equal top/bottom margins (from the wrapper's p-6),
          // capped at a comfortable max width and full available height.
          "md:flex-none md:max-w-2xl md:max-h-full md:rounded-2xl md:shadow-2xl md:bg-primary-50 md:dark:bg-primary-800 md:ring-1 md:ring-primary-300/60 md:dark:ring-primary-700/60 md:overflow-hidden",
        )}
      >
        <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-between pt-3">
          <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
            {title}
          </h2>
          <button
            type="button"
            className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
            aria-label={`Close ${title}`}
            title="Close (Esc)"
            onClick={onClose}
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="text-2xl"
            />
          </button>
        </div>
        {layout === "full" ? (
          children
        ) : layout === "scroll" ? (
          <div className="w-full max-w-2xl mx-auto flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 -mt-1">
            {children}
          </div>
        ) : (
          <div className="w-full max-w-2xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-4">
            <div className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">{children}</div>
          </div>
        )}
      </div>
    </div>
  )
}
