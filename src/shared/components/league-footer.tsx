import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export interface FooterTab {
  id: string
  icon: IconDefinition
  label: string
  active: boolean
  onSelect: () => void
}

interface Props {
  tabs: FooterTab[]
}

export default function LeagueFooter({ tabs }: Props) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-primary-100/70 dark:bg-primary-800/70 backdrop-blur-sm">
      <div className="max-w-lg mx-auto px-3 py-2 flex items-center justify-center gap-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            title={tab.label}
            aria-label={`Switch to ${tab.label}`}
            className={`w-10 h-10 rounded-full transition-colors inline-flex items-center justify-center ${
              tab.active
                ? "cursor-default bg-primary-700/10 text-primary-700 ring-1 ring-primary-500/20 dark:bg-primary-200/12 dark:text-primary-100 dark:ring-primary-300/22"
                : "cursor-pointer hover:cursor-pointer text-primary-500 hover:text-primary-300 dark:text-primary-300 dark:hover:text-primary-100"
            }`}
            onClick={tab.onSelect}
          >
            <FontAwesomeIcon
              icon={tab.icon}
              className="text-[1.35rem]"
            />
          </button>
        ))}
      </div>
    </footer>
  )
}
