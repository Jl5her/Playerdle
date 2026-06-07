import { useEffect, useRef } from "react"
import {
  trackGameAbandoned,
  trackGameComplete,
  trackGameStart,
  trackGuessSubmitted,
} from "@/lib/analytics"

interface Config {
  game: "playerdle" | "journeyman" | "statehue" | "stadiumdle"
  sport?: string
  variant?: string
  mode: "daily" | "arcade"
  maxGuesses: number
  dateKey?: string
  isArchive?: boolean
  initialGuessCount?: number
  initialGameOver?: boolean
}

export function useGameAnalytics(config: Config) {
  const configRef = useRef(config)
  configRef.current = config

  const startTimeRef = useRef<number | null>(null)
  const hasStartedRef = useRef((config.initialGuessCount ?? 0) > 0)
  const isGameOverRef = useRef(config.initialGameOver ?? false)
  const guessCountRef = useRef(config.initialGuessCount ?? 0)

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) return
      if (!hasStartedRef.current || isGameOverRef.current) return
      const cfg = configRef.current
      const elapsed = startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0
      trackGameAbandoned({
        game: cfg.game,
        sport: cfg.sport,
        variant: cfg.variant,
        mode: cfg.mode,
        guesses_made: guessCountRef.current,
        max_guesses: cfg.maxGuesses,
        seconds_active: elapsed,
      })
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  function onGuess(guessNumber: number, isCorrect: boolean) {
    guessCountRef.current = guessNumber
    const cfg = configRef.current

    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      startTimeRef.current = Date.now()
      trackGameStart({
        game: cfg.game,
        sport: cfg.sport,
        variant: cfg.variant,
        mode: cfg.mode,
        date_key: cfg.dateKey,
        is_archive: cfg.isArchive,
      })
    }

    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0

    trackGuessSubmitted({
      game: cfg.game,
      sport: cfg.sport,
      variant: cfg.variant,
      mode: cfg.mode,
      guess_number: guessNumber,
      is_correct: isCorrect,
      seconds_elapsed: elapsed,
    })
  }

  function onComplete(won: boolean, guessCount: number) {
    isGameOverRef.current = true
    const cfg = configRef.current
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    trackGameComplete({
      game: cfg.game,
      sport: cfg.sport,
      variant: cfg.variant,
      mode: cfg.mode,
      won,
      guesses: guessCount,
      seconds_to_complete: elapsed,
      date_key: cfg.dateKey,
      is_archive: cfg.isArchive,
    })
  }

  function reset() {
    startTimeRef.current = null
    hasStartedRef.current = false
    isGameOverRef.current = false
    guessCountRef.current = 0
  }

  return { onGuess, onComplete, reset }
}
