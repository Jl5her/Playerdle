import { useState } from "react"

const COPIED_TIMEOUT_MS = 3000

interface ShareOptions {
  text: string
  title?: string
}

export function useClipboardShare() {
  const [copied, setCopied] = useState(false)

  function showCopiedPill() {
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS)
  }

  function legacyCopyText(text: string) {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      showCopiedPill()
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(showCopiedPill).catch(() => legacyCopyText(text))
      return
    }
    legacyCopyText(text)
  }

  function share({ text, title }: ShareOptions) {
    const shareData: ShareData = { text }
    if (title) shareData.title = title

    const canUseShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(shareData))

    if (canUseShare) {
      navigator.share(shareData).catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return
        copyText(text)
      })
      return
    }
    copyText(text)
  }

  return { share, copied }
}
