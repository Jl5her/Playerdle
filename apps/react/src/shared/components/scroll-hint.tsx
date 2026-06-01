import { faChevronDown } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { type RefObject, useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface Props {
  scrollRef: RefObject<HTMLElement | null>
}

export default function ScrollHint({ scrollRef }: Props) {
  const [state, setState] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function isOnScreen(): boolean {
      if (!el) return false
      // checkVisibility catches opacity:0 / visibility:hidden / display:none on
      // any ancestor — e.g. a crossfade-inactive panel covering this scroller.
      type ElWithCheck = HTMLElement & {
        checkVisibility?: (opts?: {
          checkOpacity?: boolean
          checkVisibilityCSS?: boolean
        }) => boolean
      }
      const elWithCheck = el as ElWithCheck
      if (typeof elWithCheck.checkVisibility === "function") {
        if (!elWithCheck.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
          return false
        }
      } else if (!el.offsetParent && getComputedStyle(el).position !== "fixed") {
        return false
      }
      // Catches transform-translated off-screen panels (slide-up-inactive).
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false
      return true
    }

    function update() {
      if (!el) return
      const hasOverflow = el.scrollHeight > el.clientHeight + 4
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12
      const visible = hasOverflow && !atBottom && isOnScreen()
      if (!visible) {
        setState(s => (s.visible ? { ...s, visible: false } : s))
        return
      }
      const rect = el.getBoundingClientRect()
      setState({ visible: true, x: rect.left + rect.width / 2, y: rect.bottom })
    }

    update()
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    // Catches ancestor class/style flips (e.g. crossfade-active toggling) that
    // change the scroller's visibility without firing scroll/resize.
    document.addEventListener("transitionrun", update, true)
    document.addEventListener("transitionend", update, true)
    document.addEventListener("transitioncancel", update, true)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      document.removeEventListener("transitionrun", update, true)
      document.removeEventListener("transitionend", update, true)
      document.removeEventListener("transitioncancel", update, true)
      ro.disconnect()
      mo.disconnect()
    }
  }, [scrollRef])

  function handleClick() {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }

  if (typeof document === "undefined" || !state.visible) return null
  return createPortal(
    <button
      type="button"
      aria-label="Scroll to bottom"
      onClick={handleClick}
      style={{
        left: state.x,
        top: state.y,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
      className="fixed z-[2500] bg-transparent border-none p-0 cursor-pointer"
    >
      <span className="scroll-hint-bounce inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50/85 dark:bg-primary-900/85 backdrop-blur-sm shadow-md hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors">
        <FontAwesomeIcon
          icon={faChevronDown}
          className="text-primary-700 dark:text-primary-100 text-sm"
        />
      </span>
    </button>,
    document.body,
  )
}
