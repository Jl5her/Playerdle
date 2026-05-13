import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type { ReactNode } from "react"
import Overlay from "./overlay"

interface Props {
  open: boolean
  title: string
  onClose: () => void
  closeAriaLabel?: string
  children: ReactNode
}

export default function MenuOverlay({
  open,
  title,
  onClose,
  closeAriaLabel = `Close ${title}`,
  children,
}: Props) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
    >
      <div className="w-full max-w-sm mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
            {title}
          </h2>
          <button
            type="button"
            className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
            aria-label={closeAriaLabel}
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
    </Overlay>
  )
}
