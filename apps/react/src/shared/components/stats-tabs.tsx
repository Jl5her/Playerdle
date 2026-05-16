import clsx from "clsx"
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

export interface StatsTab {
  id: string
  label: string
  content: ReactNode
}

interface StatsTabsProps {
  tabs: StatsTab[]
  className?: string
  ariaLabel?: string
}

const FADE_OUT_MS = 120

export default function StatsTabs({
  tabs,
  className,
  ariaLabel = "Stats tabs",
}: StatsTabsProps) {
  const [requestedId, setRequestedId] = useState(tabs[0]?.id)
  const [displayedId, setDisplayedId] = useState(tabs[0]?.id)
  const leaving = requestedId !== displayedId

  const tablistRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  const activeTab = tabs.find(tab => tab.id === requestedId) ?? tabs[0]
  const displayedTab = tabs.find(tab => tab.id === displayedId) ?? tabs[0]

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setDisplayedId(requestedId), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [leaving, requestedId])

  useLayoutEffect(() => {
    if (!activeTab) return
    const btn = buttonRefs.current[activeTab.id]
    if (!btn) return
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
  }, [activeTab])

  useLayoutEffect(() => {
    if (ready) return
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [ready])

  useLayoutEffect(() => {
    function updateIndicator() {
      if (!activeTab) return
      const btn = buttonRefs.current[activeTab.id]
      if (!btn) return
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeTab])

  if (!activeTab || !displayedTab) return null
  if (tabs.length === 1) {
    return <div className={className}>{displayedTab.content}</div>
  }

  return (
    <div className={className}>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex gap-1 border-b border-primary-200 dark:border-primary-700 mb-4 -mx-1 px-1 overflow-x-auto"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              ref={el => {
                buttonRefs.current[tab.id] = el
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setRequestedId(tab.id)}
              className={clsx(
                "shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                isActive
                  ? "text-primary-900 dark:text-primary-50"
                  : "text-primary-500 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-100",
              )}
            >
              {tab.label}
            </button>
          )
        })}
        <span
          aria-hidden
          className={clsx(
            "pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary-700 dark:bg-primary-100",
            ready ? "stats-tabs-indicator" : null,
          )}
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      </div>
      <div
        key={`${displayedTab.id}:${leaving ? "out" : "in"}`}
        role="tabpanel"
        className={leaving ? "stats-tab-fade-out" : "stats-tab-fade-in"}
      >
        {displayedTab.content}
      </div>
    </div>
  )
}
