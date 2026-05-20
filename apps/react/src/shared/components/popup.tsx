import { useEffect, useRef, useState } from "react"

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

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 w-full flex justify-center"
      style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <div
        className={`motion-safe:transition-[opacity,transform] motion-safe:duration-200 bg-black text-white rounded-xl px-4 py-2 text-sm font-semibold text-center max-w-[min(90vw,30rem)] shadow-lg ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      >
        {message}
      </div>
    </div>
  )
}
