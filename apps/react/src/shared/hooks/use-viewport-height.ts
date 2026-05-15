import { useEffect } from "react"

// Mirrors window.visualViewport.height into the --app-height CSS variable.
// .app-viewport reads this so the app shrinks to fit when the on-screen
// keyboard slides up — without this, iOS Safari (and iOS PWAs in particular)
// scrolls the document upward to bring the focused input into view, leaving
// the top of the page unreachable because `body { overflow: hidden }`
// prevents scrolling back.
//
// Browsers without visualViewport (older Safari, some embedded contexts) fall
// back to the CSS default 100dvh.
export function useViewportHeight(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const vv = window.visualViewport

    function apply() {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`)
    }
    apply()
    vv.addEventListener("resize", apply)
    vv.addEventListener("scroll", apply)
    return () => {
      vv.removeEventListener("resize", apply)
      vv.removeEventListener("scroll", apply)
      document.documentElement.style.removeProperty("--app-height")
    }
  }, [])
}
