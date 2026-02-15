import { useEffect, useRef, useState } from "react"

interface Props {
  visible: boolean
  message: string
  durationMs?: number
}

export default function Popup({ visible, message, durationMs = 5000 }: Props) {
  const [isShown, setIsShown] = useState(false)
  const wasVisibleRef = useRef(visible)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!wasVisibleRef.current && visible) {
      setIsShown(true)
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
      }
      hideTimerRef.current = window.setTimeout(() => {
        setIsShown(false)
        hideTimerRef.current = null
      }, durationMs)
    }

    if (!visible) {
      setIsShown(false)
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    wasVisibleRef.current = visible
  }, [visible, durationMs])

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
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3 w-full flex justify-center">
      <div className="endgame-popup bg-black text-white rounded-xl px-4 py-2 text-sm font-semibold text-center max-w-[min(90vw,30rem)] shadow-lg">
        {message}
      </div>
    </div>
  )
}
