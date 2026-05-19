import { useCallback, useState } from "react"

export type ThemePreference = "light" | "dark" | "system"

const THEME_KEY = "playerdle-theme"
const HIGH_CONTRAST_KEY = "playerdle-colorblind"

export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === "dark") {
    root.classList.add("dark")
  } else if (pref === "light") {
    root.classList.remove("dark")
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }
}

export function applyHighContrast(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("high-contrast")
  } else {
    document.documentElement.classList.remove("high-contrast")
  }
}

let cancelActiveTransition: (() => void) | null = null

function playThemeTransition(direction: "to-dark" | "to-light"): Promise<void> {
  if (cancelActiveTransition) {
    cancelActiveTransition()
    cancelActiveTransition = null
  }

  return new Promise(resolve => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resolve()
      return
    }

    const created: HTMLElement[] = []

    const removeAll = () => {
      created.forEach(el => el.remove())
      cancelActiveTransition = null
    }
    cancelActiveTransition = () => {
      removeAll()
      resolve()
    }

    const cs = getComputedStyle(document.documentElement)
    const darkBg = cs.getPropertyValue("--color-primary-900").trim() || "#18263c"
    const lightBg = cs.getPropertyValue("--color-primary-50").trim() || "#f2f6fb"

    if (direction === "to-dark") {
      // Backdrop in the dark-mode background colour — visible where the collapsing
      // white overlay is clipped away, so it reads as the CRT bezel and dissolves
      // seamlessly into dark mode when the animation ends.
      // z-index 0: above body background, below #root (z-index:1).
      const backdrop = document.createElement("div")
      Object.assign(backdrop.style, {
        position: "fixed",
        inset: "0",
        zIndex: "0",
        background: darkBg,
        pointerEvents: "none",
      })
      document.body.appendChild(backdrop)
      created.push(backdrop)

      // White overlay that collapses like a CRT screen turning off.
      // Appended after backdrop so DOM order puts it on top at the same z-level.
      const overlay = document.createElement("div")
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "0",
        background: "white",
        pointerEvents: "none",
      })
      overlay.classList.add("theme-transition-tv-off")
      document.body.appendChild(overlay)
      created.push(overlay)

      overlay.addEventListener(
        "animationend",
        () => {
          removeAll()
          resolve()
        },
        { once: true },
      )
    } else {
      // CRT TV turning on: a light-mode-coloured overlay blooms from a bright dot
      // at centre into a full screen, mirroring the TV-off collapse in reverse.
      // The dark-mode body shows through the clipped area as the natural "bezel."
      // Animation ends covering the full viewport; JS applies light mode underneath
      // then fades the overlay out so the reveal is seamless.
      const overlay = document.createElement("div")
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "0",
        background: lightBg,
        pointerEvents: "none",
      })
      overlay.classList.add("theme-transition-tv-on")
      document.body.appendChild(overlay)
      created.push(overlay)

      overlay.addEventListener(
        "animationend",
        () => {
          resolve()
          overlay.style.transition = "opacity 300ms ease-out"
          overlay.style.opacity = "0"
          overlay.addEventListener("transitionend", removeAll, { once: true })
        },
        { once: true },
      )
    }
  })
}

// System theme changes use the same animated transition as the manual switcher.
// This runs once at module load and stays active for the lifetime of the page,
// replacing the plain class-toggle listener that was previously in index.html.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  const stored = (localStorage.getItem(THEME_KEY) as ThemePreference) ?? "system"
  if (stored !== "system") return
  const currentIsDark = document.documentElement.classList.contains("dark")
  if (!currentIsDark && e.matches) {
    playThemeTransition("to-dark").then(() => applyTheme("system"))
  } else if (currentIsDark && !e.matches) {
    playThemeTransition("to-light").then(() => applyTheme("system"))
  }
})

export function useSettings() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemePreference) ?? "system"
  })
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === "true"
  })

  const setTheme = useCallback((pref: ThemePreference) => {
    localStorage.setItem(THEME_KEY, pref)
    setThemeState(pref)

    const currentIsDark = document.documentElement.classList.contains("dark")
    const nextIsDark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

    if (!currentIsDark && nextIsDark) {
      // Light → dark: CRT collapse animation, then reveal dark mode.
      playThemeTransition("to-dark").then(() => applyTheme(pref))
    } else if (currentIsDark && !nextIsDark) {
      // Dark → light: fluorescent flicker animation, then reveal light mode.
      playThemeTransition("to-light").then(() => applyTheme(pref))
    } else {
      applyTheme(pref)
    }
  }, [])

  const setHighContrast = useCallback((enabled: boolean) => {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled))
    setHighContrastState(enabled)
    applyHighContrast(enabled)
  }, [])

  return { theme, setTheme, highContrast, setHighContrast }
}
