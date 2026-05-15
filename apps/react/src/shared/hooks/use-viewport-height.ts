import { useEffect } from "react"

// Mirrors window.visualViewport.height into the --app-height CSS variable.
// .app-viewport reads this so the app shrinks to fit when the on-screen
// keyboard slides up — without this, iOS Safari (and iOS PWAs in particular)
// scrolls the document upward to bring the focused input into view, leaving
// the top of the page unreachable because `body { overflow: hidden }`
// prevents scrolling back.
//
// We also reset document scroll on every focusin: iOS performs its
// auto-scroll synchronously around focus, before visualViewport.resize fires.
// Without the reset the user briefly sees the whole document shifted upward
// and has to pan it back down before the "fixed input + scrollable content"
// layout kicks in.
//
// Browsers without visualViewport (older Safari, some embedded contexts) fall
// back to the CSS default 100dvh.
export function useViewportHeight(): void {
  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport

    function applyHeight() {
      if (!vv) return
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`)
    }

    function snapDocumentToTop() {
      // Belt-and-suspenders: any of these can be non-zero on iOS after a
      // focus-driven auto-scroll, even with body { overflow: hidden }.
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0)
      if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0
      if (document.body.scrollTop !== 0) document.body.scrollTop = 0
    }

    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !target.isContentEditable) return
      // iOS schedules the auto-scroll after focus; reset on the next frame
      // (and once more shortly after to catch the late layout shift).
      requestAnimationFrame(() => {
        snapDocumentToTop()
        applyHeight()
      })
      window.setTimeout(snapDocumentToTop, 150)
    }

    applyHeight()
    vv?.addEventListener("resize", applyHeight)
    vv?.addEventListener("scroll", applyHeight)
    document.addEventListener("focusin", handleFocusIn)
    return () => {
      vv?.removeEventListener("resize", applyHeight)
      vv?.removeEventListener("scroll", applyHeight)
      document.removeEventListener("focusin", handleFocusIn)
      document.documentElement.style.removeProperty("--app-height")
    }
  }, [])
}

