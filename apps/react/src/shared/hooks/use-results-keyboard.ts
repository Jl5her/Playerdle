import { useEffect } from "react"
import { useEscapeKey } from "./use-escape-key"

interface Options {
  active: boolean
  onClose: () => void
  onPlayAgain?: () => void
}

export function useResultsKeyboard({ active, onClose, onPlayAgain }: Options) {
  useEscapeKey(active, onClose)

  useEffect(() => {
    if (!active) return
    if (!onPlayAgain) return
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      const target = e.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      if (isEditable) return
      e.preventDefault()
      onPlayAgain?.()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [active, onPlayAgain])
}
