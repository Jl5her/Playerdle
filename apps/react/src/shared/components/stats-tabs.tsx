import clsx from "clsx"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

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

export default function StatsTabs({
  tabs,
  className,
  ariaLabel = "Stats tabs",
}: StatsTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const activeTab = tabs.find(tab => tab.id === activeId) ?? tabs[0]

  const tablistRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

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

  if (!activeTab) return null
  if (tabs.length === 1) {
    return <div className={className}>{activeTab.content}</div>
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
              onClick={() => setActiveId(tab.id)}
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
        key={activeTab.id}
        role="tabpanel"
        className="stats-tab-fade-in"
      >
        {activeTab.content}
      </div>
    </div>
  )
}
