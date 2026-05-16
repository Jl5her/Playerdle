import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: number
  durationMs?: number
}

/** Tweens an integer from its previous rendered value (or 0 on first mount) to `value`. */
export function CountUp({ value, durationMs = 600 }: CountUpProps) {
  const [current, setCurrent] = useState(0)
  const currentRef = useRef(0)

  useEffect(() => {
    const startVal = currentRef.current
    if (startVal === value) {
      setCurrent(value)
      return
    }
    const start = performance.now()
    let rafId = 0
    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / durationMs, 1)
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(startVal + (value - startVal) * eased)
      currentRef.current = next
      setCurrent(next)
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [value, durationMs])

  return <>{current}</>
}

interface StatBarProps {
  count: number
  maxCount: number
  label: string
  isLoss?: boolean
}

/** A single guess-distribution row that grows its bar from 0 → target width on mount. */
export function StatBar({ count, maxCount, label, isLoss = false }: StatBarProps) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const has = count > 0
  const scaled = maxCount > 0 ? (count / maxCount) * 100 : 0
  const targetWidth = count === 0 ? "2.25rem" : `${Math.max(scaled, 12)}%`
  const width = animated ? targetWidth : count === 0 ? "2.25rem" : "0%"

  const filledClass = isLoss
    ? "bg-error-200 dark:bg-error-800 text-error-800 dark:text-error-200"
    : "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"

  return (
    <div className="flex items-center mb-1 gap-2">
      <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            "stat-bar min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end",
            has
              ? filledClass
              : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300",
          )}
          style={{ width }}
        >
          {animated ? <CountUp value={count} /> : 0}
        </div>
      </div>
    </div>
  )
}
