import { useEffect, useRef, useState } from "react"

interface Props {
  visible: boolean
  message: string
  durationMs?: number
  persistent?: boolean
  spinner?: boolean
}

export default function Popup({ visible, message, durationMs = 5000, persistent = false, spinner = false }: Props) {
  const [isShown, setIsShown] = useState(false)
  const wasVisibleRef = useRef(visible)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!wasVisibleRef.current && visible) {
      setIsShown(true)
      if (!persistent) {
        if (hideTimerRef.current !== null) {
          window.clearTimeout(hideTimerRef.current)
        }
        hideTimerRef.current = window.setTimeout(() => {
          setIsShown(false)
          hideTimerRef.current = null
        }, durationMs)
      }
    }

    if (!visible) {
      setIsShown(false)
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    wasVisibleRef.current = visible
  }, [visible, durationMs, persistent])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  if (!isShown || !message) {
    return null
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 w-full flex justify-center">
      <div className="endgame-popup bg-black text-white rounded-xl px-4 py-2 text-sm font-semibold text-center max-w-[min(90vw,30rem)] shadow-lg flex items-center gap-2">
        {spinner && (
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
        )}
        {message}
      </div>
    </div>
  )
}
