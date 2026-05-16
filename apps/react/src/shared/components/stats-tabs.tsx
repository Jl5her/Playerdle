import clsx from "clsx"
import { useState, type ReactNode } from "react"

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

  if (!activeTab) return null
  if (tabs.length === 1) {
    return <div className={className}>{activeTab.content}</div>
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 border-b border-primary-200 dark:border-primary-700 mb-4 -mx-1 px-1 overflow-x-auto"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={clsx(
                "shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px",
                isActive
                  ? "text-primary-900 dark:text-primary-50 border-primary-700 dark:border-primary-100"
                  : "text-primary-500 dark:text-primary-300 border-transparent hover:text-primary-700 dark:hover:text-primary-100",
              )}
            >
              {tab.label}
            </button>
          )
        })}
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
