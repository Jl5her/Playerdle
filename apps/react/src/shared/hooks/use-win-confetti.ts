import confetti from "canvas-confetti"
import { useEffect, useRef } from "react"

interface Options {
  won: boolean
  colors: string[]
  dedupKey: string | number | null
  duration?: number
  centerBurst?: boolean
}

export function useWinConfetti({
  won,
  colors,
  dedupKey,
  duration = 1500,
  centerBurst = true,
}: Options) {
  const lastKeyRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (!won) return
    if (dedupKey === null) return
    if (lastKeyRef.current === dedupKey) return
    lastKeyRef.current = dedupKey

    const end = Date.now() + duration

    function frame() {
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 0, y: 0 },
        colors,
        zIndex: 2000,
      })
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 1, y: 0 },
        colors,
        zIndex: 2000,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    if (centerBurst) {
      confetti({
        particleCount: 140,
        spread: 100,
        startVelocity: 55,
        origin: { x: 0.5, y: 0.3 },
        colors,
        zIndex: 2000,
      })
    }
    frame()
  }, [won, dedupKey, colors, duration, centerBurst])
}
