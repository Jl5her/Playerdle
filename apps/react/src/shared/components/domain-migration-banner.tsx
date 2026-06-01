import { useState } from "react"
import { collectSyncData } from "@/shared/utils/sync"

const NEW_DOMAIN = "playerdle.app"
const NEW_ORIGIN = "https://playerdle.app"

function buildMigrationUrl(): string {
  const { data } = collectSyncData()
  const path = location.pathname + location.search
  try {
    const encoded = btoa(JSON.stringify(data))
    return `${NEW_ORIGIN}${path}#migrate=${encoded}`
  } catch {
    return `${NEW_ORIGIN}${path}`
  }
}

export function DomainMigrationBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (location.hostname === NEW_DOMAIN || dismissed) return null

  return (
    <div className="relative z-40 flex items-center justify-center gap-3 px-10 py-2.5 bg-primary-100 dark:bg-primary-800 border-b border-primary-300 dark:border-primary-700">
      <p className="text-sm font-medium leading-snug text-primary-900 dark:text-primary-50">
        Playerdle has a new home at{" "}
        <span className="font-bold">playerdle.app</span>
      </p>
      <a
        href={buildMigrationUrl()}
        className="rounded-md bg-primary-700 px-3 py-1.5 text-xs font-bold text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
      >
        Take me there →
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary-500 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-50 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
