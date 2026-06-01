import { useEffect } from "react"

// Mirrors window.visualViewport.height into the --app-height CSS variable.
// .app-viewport reads this so the app shrinks to fit when the on-screen
// keyboard slides up — without this, iOS Safari (and iOS PWAs in particular)
// scrolls the document upward to bring the focused input into view, leaving
// the top of the page unreachable because `body { overflow: hidden }`
// prevents scrolling back.
//
// On focusin we also (a) preemptively apply the last cached keyboard-up
// height so the layout shrinks _before_ iOS decides whether to auto-scroll
// the input into view, and (b) snap document scroll back to 0 in case iOS
// shifted it anyway. The first focus on a session can't be preempted (no
// cached size yet), but subsequent focuses land in the final layout
// immediately.
//
// Browsers without visualViewport (older Safari, some embedded contexts) fall
// back to the CSS default 100dvh.
export function useViewportHeight(): void {
  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    // Cached keyboard inset (window.innerHeight - visualViewport.height). Set
    // the first time the keyboard opens; used to preemptively size the layout
    // on subsequent focuses before iOS auto-scrolls.
    let cachedKeyboardInset = 0

    function setHeight(px: number) {
      document.documentElement.style.setProperty("--app-height", `${px}px`)
    }

    function setOffsetTop(px: number) {
      // .app-viewport reads this as a translateY compensation. iOS PWAs can
      // shift the visualViewport's offsetTop (independent of document scroll)
      // when an input is focused, which leaves the absolutely-positioned
      // .game-header appearing above the visible area until the user pans
      // back down. Translating the app down by offsetTop keeps the header
      // and rest of the layout anchored to the visible viewport.
      document.documentElement.style.setProperty("--vv-offset-top", `${px}px`)
    }

    function applyFromViewport() {
      if (!vv) return
      setHeight(vv.height)
      setOffsetTop(Math.max(0, vv.offsetTop))
      const inset = window.innerHeight - vv.height
      if (inset > 50) cachedKeyboardInset = inset
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
      // Preemptive shrink using the cached keyboard size, before iOS has a
      // chance to auto-scroll. The CSS transition on .app-viewport makes
      // this animate in sync with the keyboard's own rise.
      if (cachedKeyboardInset > 0) {
        setHeight(window.innerHeight - cachedKeyboardInset)
      }
      // Reset scroll on the next frame (and once more shortly after) to
      // catch any iOS-driven document shift that slipped through.
      requestAnimationFrame(() => {
        snapDocumentToTop()
        applyFromViewport()
      })
      window.setTimeout(snapDocumentToTop, 150)
    }

    applyFromViewport()
    vv?.addEventListener("resize", applyFromViewport)
    vv?.addEventListener("scroll", applyFromViewport)
    document.addEventListener("focusin", handleFocusIn)
    return () => {
      vv?.removeEventListener("resize", applyFromViewport)
      vv?.removeEventListener("scroll", applyFromViewport)
      document.removeEventListener("focusin", handleFocusIn)
      document.documentElement.style.removeProperty("--app-height")
      document.documentElement.style.removeProperty("--vv-offset-top")
    }
  }, [])
}
