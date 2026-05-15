import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import type { ReactNode } from "react"
import { useEscapeKey } from "@/shared/hooks/use-escape-key"

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function ResultsSlidePanel({ open, onClose, title = "Results", children }: Props) {
  useEscapeKey(open, onClose)
  return (
    <div
      className={clsx(
        "slide-up-panel absolute inset-0 flex flex-col bg-primary-50 dark:bg-primary-900",
        open ? "slide-up-active" : "slide-up-inactive",
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
      {children}
    </div>
  )
}
