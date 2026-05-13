import { useEffect, useRef } from "react"

// Module-level LIFO stack so only the top-most active overlay receives Escape.
const escapeStack: Array<() => void> = []
let listenerAttached = false

function handleKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return
  if (escapeStack.length === 0) return
  const top = escapeStack[escapeStack.length - 1]
  e.preventDefault()
  top()
}

function ensureListener() {
  if (listenerAttached) return
  window.addEventListener("keydown", handleKey)
  listenerAttached = true
}

export function useEscapeKey(active: boolean, onEscape: () => void) {
  const cbRef = useRef(onEscape)
  cbRef.current = onEscape

  useEffect(() => {
    if (!active) return
    ensureListener()
    const fire = () => cbRef.current()
    escapeStack.push(fire)
    return () => {
      const idx = escapeStack.lastIndexOf(fire)
      if (idx >= 0) escapeStack.splice(idx, 1)
    }
  }, [active])
}
