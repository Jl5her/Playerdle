import { useEffect, useRef, useState } from "react"

const AUTO_OPEN_DELAY_MS = 1500

export function useAutoResults(gameOver: boolean) {
  const wasOverAtMountRef = useRef(gameOver)
  const [showResults, setShowResults] = useState(wasOverAtMountRef.current)

  useEffect(() => {
    if (!gameOver) {
      setShowResults(false)
      return
    }
    if (wasOverAtMountRef.current) return
    const t = setTimeout(() => setShowResults(true), AUTO_OPEN_DELAY_MS)
    return () => clearTimeout(t)
  }, [gameOver])

  function openResults() {
    setShowResults(true)
  }

  function closeResults() {
    setShowResults(false)
  }

  function resetForReplay() {
    wasOverAtMountRef.current = false
    setShowResults(false)
  }

  return { showResults, openResults, closeResults, resetForReplay }
}
