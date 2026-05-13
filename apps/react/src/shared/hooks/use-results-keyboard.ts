import { useEffect } from "react"

interface Options {
  active: boolean
  onClose: () => void
  onPlayAgain?: () => void
}

export function useResultsKeyboard({ active, onClose, onPlayAgain }: Options) {
  useEffect(() => {
    if (!active) return
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === "Enter" && onPlayAgain && !isEditable) {
        e.preventDefault()
        onPlayAgain()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [active, onClose, onPlayAgain])
}
