import { useEffect, useState } from "react"
import Popup from "./popup"

export default function PWAUpdateToast() {
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    let initialControllerSet = !!navigator.serviceWorker.controller
    const handleChange = () => {
      // First controller assignment after a fresh load is normal; only treat
      // subsequent swaps as "a new SW just took over → app was updated".
      if (!initialControllerSet) {
        initialControllerSet = true
        return
      }
      setUpdated(true)
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleChange)
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleChange)
    }
  }, [])

  return (
    <Popup
      visible={updated}
      message="Updated to latest version"
      durationMs={3500}
    />
  )
}
