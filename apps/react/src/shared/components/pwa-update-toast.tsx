import { useEffect, useState } from "react"
import Popup from "./popup"

export default function PWAUpdateToast() {
  const [updating, setUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    // Track whether a SW was already controlling the page at mount time.
    // The first controllerchange (and updatefound) on a fresh install is not an update.
    let isFirstInstall = !navigator.serviceWorker.controller
    let cleanupUpdateFound: (() => void) | null = null

    navigator.serviceWorker.ready.then(registration => {
      const handleUpdateFound = () => {
        if (isFirstInstall) return
        setUpdating(true)
      }
      registration.addEventListener("updatefound", handleUpdateFound)
      cleanupUpdateFound = () => registration.removeEventListener("updatefound", handleUpdateFound)
    })

    const handleControllerChange = () => {
      if (isFirstInstall) {
        isFirstInstall = false
        return
      }
      setUpdating(false)
      setUpdated(true)
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
      cleanupUpdateFound?.()
    }
  }, [])

  return (
    <>
      <Popup visible={updating} message="Updating…" persistent spinner />
      <Popup visible={updated} message="Updated to latest version" durationMs={3500} />
    </>
  )
}
