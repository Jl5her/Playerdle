import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const TRANSITION_MS = 200

interface Props {
  visible: boolean
  message: string
  durationMs?: number
}

export default function Popup({ visible, message, durationMs = 5000 }: Props) {
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const wasVisibleRef = useRef(visible)
  const hideTimerRef = useRef<number | null>(null)
  const unmountTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const prevVisible = wasVisibleRef.current
    wasVisibleRef.current = visible

    if (!prevVisible && visible) {
      if (unmountTimerRef.current !== null) {
        window.clearTimeout(unmountTimerRef.current)
        unmountTimerRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }

      setIsMounted(true)
      setIsVisible(false)

      // Double rAF: first frame mounts at opacity-0, second triggers the CSS transition in
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setIsVisible(true)
          rafRef.current = null
          hideTimerRef.current = window.setTimeout(() => {
            setIsVisible(false)
            hideTimerRef.current = null
            unmountTimerRef.current = window.setTimeout(() => {
              setIsMounted(false)
              unmountTimerRef.current = null
            }, TRANSITION_MS + 50)
          }, durationMs - TRANSITION_MS)
        })
      })
    }

    if (prevVisible && !visible) {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setIsVisible(false)
      unmountTimerRef.current = window.setTimeout(() => {
        setIsMounted(false)
        unmountTimerRef.current = null
      }, TRANSITION_MS + 50)
    }
  }, [visible, durationMs])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
      if (unmountTimerRef.current !== null) window.clearTimeout(unmountTimerRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!isMounted || !message) return null

  // Portaled to <body>: ancestors like .app-viewport and .crossfade-panel use
  // transform/will-change, which would otherwise become the containing block for
  // `position: fixed` and pin the popup below the header, covering game content.
  // At the top edge it sits over the game title in a browser tab, and just below
  // the status bar / Dynamic Island in a standalone PWA (via safe-area-inset-top).
  return createPortal(
    <div
      className="fixed inset-x-0 z-50 pointer-events-none px-3 flex justify-center"
      style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <div
        className={`origin-top motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] bg-black text-white rounded-full px-5 py-2 text-sm font-semibold text-center max-w-[min(90vw,30rem)] shadow-lg ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-3 scale-x-75 scale-y-50"}`}
      >
        {message}
      </div>
    </div>,
    document.body,
  )
}
