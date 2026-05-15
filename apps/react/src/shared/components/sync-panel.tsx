import { faCheck, faCopy, faRotate } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  getOrCreatePassphrase,
  normalizePassphrase,
  pullFromCloud,
  pushToCloud,
  restoreSyncData,
  setPassphrase,
} from "@/shared/utils/sync"

type Status =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "save-ok" }
  | { type: "save-err"; message: string }
  | { type: "importing" }
  | { type: "import-confirm"; phrase: string; lastUpdated: string }
  | { type: "import-ok" }
  | { type: "import-err"; message: string }

export default function SyncPanel() {
  const [passphrase, setLocalPassphrase] = useState("")
  const [copied, setCopied] = useState(false)
  const [importInput, setImportInput] = useState("")
  const [status, setStatus] = useState<Status>({ type: "idle" })
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalPassphrase(getOrCreatePassphrase())
  }, [])

  const words = passphrase.split("-")

  function handleCopy() {
    const display = words.join(" ")
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSave() {
    setStatus({ type: "saving" })
    try {
      await pushToCloud(passphrase)
      setStatus({ type: "save-ok" })
    } catch (e) {
      setStatus({ type: "save-err", message: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  async function handleImportStart() {
    const normalized = normalizePassphrase(importInput)
    if (!normalized) {
      setStatus({ type: "import-err", message: "Enter all 5 words separated by spaces or dashes" })
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
      setLocalPassphrase(phrase)
      setImportInput("")
      setStatus({ type: "import-ok" })
    } catch {
      setStatus({ type: "import-err", message: "Import failed. Please try again." })
    }
  }, [status])

  function reset() {
    setStatus({ type: "idle" })
  }

  const isLoading = status.type === "saving" || status.type === "importing"

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Your code */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
          Your Sync Code
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-100 font-mono text-sm font-semibold tracking-wide"
            >
              {word}
            </span>
          ))}
        </div>
        <p className="text-xs text-primary-500 dark:text-primary-400">
          Share this code with your other device to sync progress.
        </p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-sm" />
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`text-sm ${status.type === "saving" ? "animate-spin" : ""}`}
            />
            Save to Cloud
          </button>
        </div>
        {status.type === "save-ok" && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Saved! Your progress is backed up.
          </p>
        )}
        {status.type === "save-err" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </section>

      <hr className="border-primary-200 dark:border-primary-700" />

      {/* Import */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
          Import from Another Device
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
                Import & Replace
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-md text-sm font-bold border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : status.type === "import-ok" ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Import successful! Your progress has been updated.
          </p>
        ) : (
          <>
            <input
              type="text"
              value={importInput}
              onChange={e => {
                setImportInput(e.target.value)
                if (status.type === "import-err") reset()
              }}
              placeholder="hawk wolf bear deer fox"
              className="w-full px-3 py-2 rounded-md border-2 border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-50 placeholder-primary-400 dark:placeholder-primary-500 font-mono text-sm focus:outline-none focus:border-primary-500 dark:focus:border-primary-400"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {status.type === "import-err" && (
              <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
            )}
            <button
              type="button"
              onClick={handleImportStart}
              disabled={isLoading || importInput.trim().length === 0}
              className="self-start px-4 py-2 rounded-md text-sm font-bold transition-colors bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status.type === "importing" ? "Loading…" : "Import Progress"}
            </button>
            <p className="text-xs text-primary-500 dark:text-primary-400">
              After importing you'll share the same sync code as that device.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
