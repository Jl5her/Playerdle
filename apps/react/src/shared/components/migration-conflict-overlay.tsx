import type { MergeConflict } from "@/shared/utils/sync"

interface MigrationConflictOverlayProps {
  conflicts: MergeConflict[]
  onKeepNew: () => void
  onKeepOld: () => void
}

export function MigrationConflictOverlay({
  conflicts,
  onKeepNew,
  onKeepOld,
}: MigrationConflictOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-xl bg-primary-50 dark:bg-primary-900 shadow-2xl p-5 flex flex-col gap-4">
        <div className="rounded-md border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Progress found on both domains
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            You have an in-progress game on both{" "}
            <span className="font-mono">playerdle.jackp.me</span> and{" "}
            <span className="font-mono">playerdle.app</span>. Choose which version
            to keep for:
          </p>
          <ul className="mt-2 space-y-0.5">
            {conflicts.map(c => (
              <li key={c.key} className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                • {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onKeepNew}
            className="flex-1 px-4 py-2 rounded-md text-sm font-bold bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
          >
            Keep playerdle.app
          </button>
          <button
            type="button"
            onClick={onKeepOld}
            className="flex-1 px-4 py-2 rounded-md text-sm font-bold border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
          >
            Keep jackp.me
          </button>
        </div>
      </div>
    </div>
  )
}
