import {
  faArrowsRotate,
  faCheck,
  faCopy,
  faLinkSlash,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useCallback, useEffect, useRef, useState } from "react"
import MenuLinkButton from "./menu-link-button"
import Popup from "./popup"
import {
  analyzeMerge,
  applyData,
  clearPassphrase,
  collectSyncData,
  createPassphrase,
  getLastSynced,
  getPassphrase,
  type MergeAnalysis,
  normalizePassphrase,
  pullFromCloud,
  pushToCloud,
  resolveMerge,
  restoreSyncData,
  setPassphrase,
  SYNC_TTL_DAYS,
  type SyncPayload,
  unlinkFromCloud,
} from "@/shared/utils/sync"

type PanelView = "no-code" | "active" | "expired"

type ActionStatus =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "save-err"; message: string }
  | { type: "importing" }
  | {
      type: "import-confirm"
      phrase: string
      lastUpdated: string
      payload: SyncPayload
      devices: number
    }
  | { type: "import-ok" }
  | { type: "import-err"; message: string }
  | { type: "unlinking" }
  | { type: "merge-conflict"; analysis: MergeAnalysis; phrase: string }
  | { type: "resolving-merge" }

function formatSyncedAt(date: Date): string {
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

const CONFIRM_REVERT_MS = 3000

export default function SyncPanel() {
  const [view, setView] = useState<PanelView>("no-code")
  const [passphrase, setLocalPassphrase] = useState("")
  const [deviceCount, setDeviceCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [importInput, setImportInput] = useState("")
  const [status, setStatus] = useState<ActionStatus>({ type: "idle" })
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unlinkRevertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const linked = deviceCount > 1

  useEffect(() => {
    if (!confirmingUnlink) return
    if (unlinkRevertTimer.current) clearTimeout(unlinkRevertTimer.current)
    unlinkRevertTimer.current = setTimeout(() => {
      setConfirmingUnlink(false)
    }, CONFIRM_REVERT_MS)
    return () => {
      if (unlinkRevertTimer.current) {
        clearTimeout(unlinkRevertTimer.current)
        unlinkRevertTimer.current = null
      }
    }
  }, [confirmingUnlink])

  useEffect(() => {
    const phrase = getPassphrase()
    if (!phrase) {
      setView("no-code")
      return
    }
    setLocalPassphrase(phrase)
    setLastSynced(getLastSynced())
    setView("active")
    // Snapshot local data before the async pull so the comparison is consistent.
    const localData = collectSyncData().data
    pullFromCloud(phrase)
      .then(({ payload, devices }) => {
        setDeviceCount(devices)
        setLastSynced(getLastSynced())
        // Analyze local vs remote to detect conflicts or easy merges.
        const analysis = analyzeMerge(localData, payload.data)
        if (analysis.hasConflicts) {
          setStatus({ type: "merge-conflict", analysis, phrase })
        } else {
          // No conflicts: apply best-effort merge (picks up any completions from
          // other devices) and push the unified snapshot back to the cloud.
          const hasNewData = Object.entries(analysis.easyMerged).some(
            ([k, v]) => localData[k] !== v,
          )
          if (hasNewData) {
            applyData(analysis.easyMerged)
            void pushToCloud(phrase)
              .then(d => {
                setDeviceCount(d)
                setLastSynced(getLastSynced())
              })
              .catch(() => {})
          }
        }
      })
      .catch(err => {
        const is404 = err instanceof Error && err.message.includes("No data found")
        if (is404) {
          clearPassphrase()
          setView("expired")
        }
        // Other errors: keep the active view with whatever device count we have.
      })
  }, [])

  function flashSavedToast() {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setSavedToast(true)
    savedTimer.current = setTimeout(() => setSavedToast(false), 2000)
  }

  async function autoSaveAfterGenerate(phrase: string) {
    setStatus({ type: "saving" })
    try {
      const devices = await pushToCloud(phrase)
      setDeviceCount(devices)
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
    setDeviceCount(0)
    setLastSynced(null)
    setView("active")
    setStatus({ type: "idle" })
    void autoSaveAfterGenerate(phrase)
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
      const localData = collectSyncData().data
      const { payload, devices } = await pullFromCloud(passphrase)
      setDeviceCount(devices)
      const analysis = analyzeMerge(localData, payload.data)
      if (analysis.hasConflicts) {
        setStatus({ type: "merge-conflict", analysis, phrase: passphrase })
        return
      }
      applyData(analysis.easyMerged)
      const finalDevices = await pushToCloud(passphrase)
      setDeviceCount(finalDevices)
      setLastSynced(getLastSynced())
      setStatus({ type: "idle" })
      flashSavedToast()
    } catch (e) {
      setStatus({ type: "save-err", message: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  async function handleMergeResolve(winner: "local" | "remote") {
    if (status.type !== "merge-conflict") return
    const { analysis, phrase } = status
    setStatus({ type: "resolving-merge" })
    try {
      applyData(resolveMerge(analysis, winner))
      const devices = await pushToCloud(phrase)
      setDeviceCount(devices)
      setLastSynced(getLastSynced())
      setStatus({ type: "idle" })
      flashSavedToast()
    } catch (e) {
      setStatus({ type: "save-err", message: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  async function handleUnlinkConfirm() {
    setConfirmingUnlink(false)
    setStatus({ type: "unlinking" })
    try {
      await unlinkFromCloud(passphrase)
    } catch {
      // If the network call fails we still clear the local code; the cloud
      // entry will age out on its own once it stops getting refreshed.
    }
    clearPassphrase()
    setLocalPassphrase("")
    setDeviceCount(0)
    setLastSynced(null)
    setStatus({ type: "idle" })
    setView("no-code")
  }

  async function handleImportStart() {
    const normalized = normalizePassphrase(importInput)
    if (!normalized) {
      setStatus({ type: "import-err", message: "Enter all 5 words separated by dashes" })
      return
    }
    setStatus({ type: "importing" })
    try {
      const { payload, devices } = await pullFromCloud(normalized)
      const date = new Date(payload.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      setStatus({
        type: "import-confirm",
        phrase: normalized,
        lastUpdated: date,
        payload,
        devices,
      })
    } catch (e) {
      setStatus({
        type: "import-err",
        message: e instanceof Error ? e.message : "Could not reach sync server",
      })
    }
  }

  const handleImportConfirm = useCallback(() => {
    if (status.type !== "import-confirm") return
    const { phrase, payload, devices } = status
    // Revoke the current code when switching to another device's code.
    if (passphrase && passphrase !== phrase) {
      void unlinkFromCloud(passphrase).catch(() => {})
    }
    restoreSyncData(payload)
    setPassphrase(phrase)
    setLocalPassphrase(phrase)
    setDeviceCount(devices)
    setLastSynced(getLastSynced())
    setImportInput("")
    setView("active")
    setStatus({ type: "import-ok" })
  }, [status, passphrase])

  function resetStatus() {
    setStatus({ type: "idle" })
  }

  const isLoading =
    status.type === "saving" ||
    status.type === "importing" ||
    status.type === "unlinking" ||
    status.type === "resolving-merge"

  const linkSection = (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
        Link Another Device
      </h3>

      {status.type === "import-confirm" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-primary-700 dark:text-primary-200">
            Found data saved on{" "}
            <span className="font-semibold">{status.lastUpdated}</span>.{" "}
            {passphrase
              ? "This will switch your sync code and replace your current progress on this device."
              : "This will replace your current progress on this device."}
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
  )

  const toasts = (
    <>
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
    </>
  )

  if (view === "no-code") {
    return (
      <div className="flex flex-col gap-8 pt-2">
        {toasts}
        <section className="flex flex-col gap-5 items-center text-center">
          <p className="text-sm text-primary-600 dark:text-primary-300">
            Sync your game progress across devices without signing in. A 5-word code links your
            devices. Codes only expire {SYNC_TTL_DAYS} days after the last device unlinks.
          </p>
          <MenuLinkButton
            label="Generate Sync Code"
            onClick={handleGenerate}
          />
        </section>
        <hr className="border-primary-200 dark:border-primary-700" />
        {linkSection}
      </div>
    )
  }

  if (view === "expired") {
    return (
      <div className="flex flex-col gap-8 pt-2">
        {toasts}
        <section className="flex flex-col gap-5">
          <div className="rounded-md border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Your sync code expired
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Cloud data is deleted {SYNC_TTL_DAYS} days after the last device unlinks. Your
              progress on this device is untouched.
            </p>
          </div>
          <div className="flex justify-center">
            <MenuLinkButton
              label="Generate New Code"
              onClick={handleGenerate}
            />
          </div>
        </section>
        <hr className="border-primary-200 dark:border-primary-700" />
        {linkSection}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      {toasts}

      {/* Your code */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
          Your Sync Code
        </h3>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy sync code to clipboard"
            className="inline-flex items-center gap-2 max-w-full rounded-md bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-100 font-mono text-sm font-semibold tracking-wide break-all px-3 py-1.5 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors"
          >
            <span className="break-all">{passphrase}</span>
            <FontAwesomeIcon
              icon={copied ? faCheck : faCopy}
              className="text-xs text-primary-500 dark:text-primary-300 shrink-0"
              aria-hidden="true"
            />
          </button>
          <p className="text-xs text-primary-500 dark:text-primary-400">
            Tap the phrase to copy
          </p>
        </div>
        <div className="flex justify-center">
          {linked ? (
            <button
              type="button"
              onClick={() => {
                if (confirmingUnlink) {
                  void handleUnlinkConfirm()
                } else {
                  setConfirmingUnlink(true)
                }
              }}
              disabled={isLoading && !confirmingUnlink}
              aria-label={
                confirmingUnlink ? "Confirm unlink this device" : "Unlink this device from the code"
              }
              title={confirmingUnlink ? "Tap to confirm" : "Unlink this device"}
              className={`inline-flex items-center gap-2 rounded-md text-sm font-semibold px-4 py-2 transition-all duration-200 ${
                confirmingUnlink
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border-2 border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-200 hover:border-primary-500 dark:hover:border-primary-400"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <FontAwesomeIcon
                icon={confirmingUnlink ? faCheck : faLinkSlash}
                className="text-sm"
              />
              <span>{confirmingUnlink ? "Confirm Unlink" : "Unlink"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (confirmingUnlink) {
                  void handleUnlinkConfirm()
                } else {
                  setConfirmingUnlink(true)
                }
              }}
              disabled={isLoading && !confirmingUnlink}
              aria-label={confirmingUnlink ? "Confirm revoke sync code" : "Revoke this sync code"}
              title={confirmingUnlink ? "Tap to confirm" : "Revoke this sync code"}
              className={`inline-flex items-center gap-2 rounded-md text-sm font-semibold px-4 py-2 transition-all duration-200 ${
                confirmingUnlink
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border-2 border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-200 hover:border-primary-500 dark:hover:border-primary-400"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <FontAwesomeIcon
                icon={confirmingUnlink ? faCheck : faLinkSlash}
                className="text-sm"
              />
              <span>{confirmingUnlink ? "Confirm Revoke" : "Revoke"}</span>
            </button>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <p className="text-xs text-primary-500 dark:text-primary-400">
            {linked
              ? `${deviceCount} devices linked`
              : deviceCount === 1
                ? "Only this device is linked"
                : "Not yet saved to cloud"}
          </p>
          {lastSynced && (
            <p className="text-xs text-primary-500 dark:text-primary-400">
              Last synced {formatSyncedAt(lastSynced)}
            </p>
          )}
        </div>
        {status.type === "merge-conflict" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Devices are out of sync
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                We've noticed your devices are out of sync. Would you like to keep your progress on
                this device or overwrite with what's in the cloud?
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => void handleMergeResolve("local")}
                className="flex-1 px-4 py-2 rounded-md text-sm font-bold bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
              >
                Keep This Device
              </button>
              <button
                type="button"
                onClick={() => void handleMergeResolve("remote")}
                className="flex-1 px-4 py-2 rounded-md text-sm font-bold border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
              >
                Keep Cloud
              </button>
            </div>
            <button
              type="button"
              onClick={resetStatus}
              className="text-xs text-primary-500 dark:text-primary-400 hover:underline"
            >
              Decide later
            </button>
          </div>
        ) : (
          linked && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-colors bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon
                  icon={faArrowsRotate}
                  className={`text-sm ${status.type === "saving" || status.type === "resolving-merge" ? "animate-spin" : ""}`}
                />
                {status.type === "resolving-merge" ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          )
        )}
        {copyError && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{copyError}</p>
        )}
        {status.type === "save-err" && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{status.message}</p>
        )}
      </section>
      <hr className="border-primary-200 dark:border-primary-700" />
      {linkSection}
    </div>
  )
}
