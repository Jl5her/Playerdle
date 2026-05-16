import {
  faArrowsRotate,
  faCheck,
  faCopy,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useCallback, useEffect, useRef, useState } from "react"
import Popup from "./popup"
import {
  clearPassphrase,
  createPassphrase,
  extendLocalExpiry,
  getExpiresAt,
  getLastSynced,
  getPassphrase,
  isLinked,
  isLocallyExpired,
  normalizePassphrase,
  pullFromCloud,
  pushToCloud,
  restoreSyncData,
  setLinked,
  setPassphrase,
  SYNC_TTL_DAYS,
} from "@/shared/utils/sync"

type PanelView = "no-code" | "checking-expiry" | "expired" | "active"

type ActionStatus =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "save-ok" }
  | { type: "save-err"; message: string }
  | { type: "importing" }
  | { type: "import-confirm"; phrase: string; lastUpdated: string }
  | { type: "import-ok" }
  | { type: "import-err"; message: string }

function daysLeft(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function formatSyncedAt(date: Date): string {
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

export default function SyncPanel() {
  const [view, setView] = useState<PanelView>("no-code")
  const [passphrase, setLocalPassphrase] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [linked, setLinkedState] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [importInput, setImportInput] = useState("")
  const [status, setStatus] = useState<ActionStatus>({ type: "idle" })
  const [confirmingReset, setConfirmingReset] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const phrase = getPassphrase()
    if (!phrase) {
      setView("no-code")
      return
    }
    setLocalPassphrase(phrase)
    setLinkedState(isLinked())
    setLastSynced(getLastSynced())

    if (!isLocallyExpired()) {
      setExpiresAt(getExpiresAt())
      setView("active")
      return
    }

    setView("checking-expiry")
    pullFromCloud(phrase)
      .then(() => {
        extendLocalExpiry()
        setExpiresAt(getExpiresAt())
        setLastSynced(getLastSynced())
        setView("active")
      })
      .catch(err => {
        const is404 = err instanceof Error && err.message.includes("No data found")
        if (is404) {
          clearPassphrase()
          setView("expired")
        } else {
          extendLocalExpiry()
          setExpiresAt(getExpiresAt())
          setView("active")
        }
      })
  }, [])

  function flashSavedToast() {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setSavedToast(true)
    savedTimer.current = setTimeout(() => setSavedToast(false), 2000)
  }

  async function autoSaveOnGenerate(phrase: string) {
    setStatus({ type: "saving" })
    try {
      await pushToCloud(phrase)
      setExpiresAt(getExpiresAt())
      setLastSynced(getLastSynced())
      setStatus({ type: "idle" })
      flashSavedToast()
    } catch (e) {
      setStatus({ type: "save-err", message: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  function handleGenerate() {
    const phrase = createPassphrase()
    setLocalPassphrase(phrase)
    setExpiresAt(null)
    setLastSynced(null)
    setLinkedState(false)
    setView("active")
    setStatus({ type: "idle" })
    void autoSaveOnGenerate(phrase)
  }

  function handleCopy() {
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    navigator.clipboard
      .writeText(passphrase)
      .then(() => {
        setCopied(true)
        setCopyError(null)
        copiedTimer.current = setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        setCopyError("Could not copy — please copy the code manually.")
      })
  }

  async function handleSync() {
    setStatus({ type: "saving" })
    try {
      await pushToCloud(passphrase)
      setExpiresAt(getExpiresAt())
      setLastSynced(getLastSynced())
      setStatus({ type: "save-ok" })
      flashSavedToast()
    } catch (e) {
      setStatus({ type: "save-err", message: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  async function handleImportStart() {
    const normalized = normalizePassphrase(importInput)
    if (!normalized) {
      setStatus({ type: "import-err", message: "Enter all 5 words separated by dashes" })
      return
    }
    setStatus({ type: "importing" })
    try {
      const payload = await pullFromCloud(normalized)
      const date = new Date(payload.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      setStatus({ type: "import-confirm", phrase: normalized, lastUpdated: date })
    } catch (e) {
      setStatus({
        type: "import-err",
        message: e instanceof Error ? e.message : "Could not reach sync server",
      })
    }
  }

  const handleImportConfirm = useCallback(async () => {
    if (status.type !== "import-confirm") return
    const { phrase } = status
    try {
      const payload = await pullFromCloud(phrase)
      restoreSyncData(payload)
      setPassphrase(phrase)
      extendLocalExpiry()
      setLinked()
      setLocalPassphrase(phrase)
      setExpiresAt(getExpiresAt())
      setLastSynced(getLastSynced())
      setLinkedState(true)
      setImportInput("")
      setStatus({ type: "import-ok" })
    } catch {
      setStatus({ type: "import-err", message: "Import failed. Please try again." })
    }
  }, [status])

  function resetStatus() {
    setStatus({ type: "idle" })
  }

  function handleResetConfirm() {
    clearPassphrase()
    const phrase = createPassphrase()
    setLocalPassphrase(phrase)
    setExpiresAt(null)
    setLastSynced(null)
    setLinkedState(false)
    setImportInput("")
    setStatus({ type: "idle" })
    setConfirmingReset(false)
    void autoSaveOnGenerate(phrase)
  }

  const isLoading = status.type === "saving" || status.type === "importing"

  if (view === "no-code") {
    return (
      <div className="flex flex-col gap-4 pt-1">
        <p className="text-sm text-primary-600 dark:text-primary-300">
          Sync your game progress across devices without signing in. A 5-word code links your
          devices. Codes expire {SYNC_TTL_DAYS} days after last use.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          className="self-start px-5 py-2.5 rounded-md font-bold text-sm bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
        >
          Generate Sync Code
        </button>
      </div>
    )
  }

  if (view === "checking-expiry") {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <p className="text-sm text-primary-500 dark:text-primary-400 animate-pulse">
          Checking sync status…
        </p>
      </div>
    )
  }

  if (view === "expired") {
    return (
      <div className="flex flex-col gap-4 pt-1">
        <div className="rounded-md border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Your sync code expired
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Cloud data is deleted {SYNC_TTL_DAYS} days after last use. Your progress on this device
            is untouched.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="self-start px-5 py-2.5 rounded-md font-bold text-sm bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
        >
          Generate New Code
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pt-1 relative">
      <Popup
        visible={copied}
        message="Copied to clipboard"
        durationMs={2000}
      />
      <Popup
        visible={savedToast}
        message="Saved to cloud"
        durationMs={2000}
      />

      {/* Your code */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
          Your Sync Code
        </h3>
        {confirmingReset ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-primary-700 dark:text-primary-200">
              This generates a new code. Any data saved to the old code will no longer be
              accessible. Your progress on this device is untouched.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-4 py-2 rounded-md text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Generate New Code
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="px-4 py-2 rounded-md text-sm font-bold border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy sync code to clipboard"
              className="rounded-md bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-100 font-mono text-sm font-semibold tracking-wide break-all px-3 py-1.5 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors"
            >
              {passphrase}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy sync code"
              className="p-2 rounded-md text-primary-500 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-base" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              aria-label="Generate a new code"
              title="Generate a new code"
              className="p-2 rounded-md text-primary-500 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-base" />
            </button>
          </div>
        )}
        {!confirmingReset && (
          <div className="flex flex-col gap-0.5">
            {expiresAt && (
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Expires in {daysLeft(expiresAt)} day{daysLeft(expiresAt) === 1 ? "" : "s"}
              </p>
            )}
            {lastSynced && (
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Last synced {formatSyncedAt(lastSynced)}
              </p>
            )}
          </div>
        )}
        {linked && !confirmingReset && (
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleSync}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon
                icon={faArrowsRotate}
                className={`text-sm ${status.type === "saving" ? "animate-spin" : ""}`}
              />
              Sync
            </button>
          </div>
        )}
        {copyError && (
          <p className="text-sm text-red-600 dark:text-red-400">{copyError}</p>
        )}
        {status.type === "save-err" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </section>

      <hr className="border-primary-200 dark:border-primary-700" />

      {/* Link */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
          Link Another Device
        </h3>

        {status.type === "import-confirm" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-primary-700 dark:text-primary-200">
              Found data saved on{" "}
              <span className="font-semibold">{status.lastUpdated}</span>. This will replace your
              current progress on this device.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImportConfirm}
                className="px-4 py-2 rounded-md text-sm font-bold bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
              >
                Link & Replace
              </button>
              <button
                type="button"
                onClick={resetStatus}
                className="px-4 py-2 rounded-md text-sm font-bold border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : status.type === "import-ok" ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Linked! Your progress has been updated.
          </p>
        ) : (
          <>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                value={importInput}
                onChange={e => {
                  setImportInput(e.target.value)
                  if (status.type === "import-err") resetStatus()
                }}
                placeholder="hawk-wolf-bear-deer-fox"
                className="flex-1 min-w-0 px-3 py-2 rounded-md border-2 border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-50 placeholder-primary-400 dark:placeholder-primary-500 font-mono text-sm focus:outline-none focus:border-primary-500 dark:focus:border-primary-400"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
              />
              <button
                type="button"
                onClick={handleImportStart}
                disabled={isLoading || importInput.trim().length === 0}
                className="shrink-0 px-4 py-2 rounded-md text-sm font-bold transition-colors bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status.type === "importing" ? "Loading…" : "Link"}
              </button>
            </div>
            {status.type === "import-err" && (
              <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
            )}
            <p className="text-xs text-primary-500 dark:text-primary-400">
              After linking you'll share the same sync code as that device.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
