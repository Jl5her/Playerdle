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
    <div className="relative z-40 flex items-center gap-3 px-4 py-2.5 bg-amber-400 dark:bg-amber-500 text-amber-950">
      <p className="flex-1 text-sm font-medium leading-snug">
        Playerdle has a new home at{" "}
        <span className="font-bold">playerdle.app</span>
      </p>
      <a
        href={buildMigrationUrl()}
        className="shrink-0 rounded-md bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-800 transition-colors"
      >
        Take me there →
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-800 hover:text-amber-950 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
