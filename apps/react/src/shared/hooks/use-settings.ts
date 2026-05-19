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

function playThemeTransition(direction: "to-dark" | "to-light", pref: ThemePreference): void {
  if (cancelActiveTransition) {
    cancelActiveTransition()
    cancelActiveTransition = null
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(pref)
    return
  }

  // Apply the new theme class immediately so CSS colour transitions on all
  // content elements start in sync with the overlay animation. The overlay
  // hides the background switch; the content colours drift visibly above it.
  applyTheme(pref)

  const root = document.documentElement
  const dur = direction === "to-dark" ? "650ms" : "750ms"
  root.style.setProperty("--tt-dur", dur)
  root.classList.add("theme-transitioning")

  const cs = getComputedStyle(root)
  const darkBg = cs.getPropertyValue("--color-primary-900").trim() || "#18263c"
  const lightBg = cs.getPropertyValue("--color-primary-50").trim() || "#f2f6fb"

  const created: HTMLElement[] = []

  const removeAll = () => {
    created.forEach(el => el.remove())
    root.classList.remove("theme-transitioning")
    root.style.removeProperty("--tt-dur")
    cancelActiveTransition = null
  }
  cancelActiveTransition = removeAll

  // Dark backdrop sits behind the animated overlay at the same z-level.
  // For TV-off: reveals the dark-mode bezel as the white screen collapses.
  // For TV-on: hides the now-light body so the dark surround is visible
  //   while the light dot expands from centre — without it the dot would be
  //   invisible against the newly-applied light background.
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

  // Coloured overlay that carries the CRT animation.
  // Appended after the backdrop so DOM order puts it on top at the same z-level.
  const overlay = document.createElement("div")
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "0",
    background: direction === "to-dark" ? "white" : lightBg,
    pointerEvents: "none",
  })
  overlay.classList.add(
    direction === "to-dark" ? "theme-transition-tv-off" : "theme-transition-tv-on",
  )
  document.body.appendChild(overlay)
  created.push(overlay)

  if (direction === "to-dark") {
    overlay.addEventListener("animationend", removeAll, { once: true })
  } else {
    overlay.addEventListener(
      "animationend",
      () => {
        // Light mode and colour transitions are already complete; fade the
        // overlay out to reveal the finished light-mode page underneath.
        overlay.style.transition = "opacity 300ms ease-out"
        overlay.style.opacity = "0"
        overlay.addEventListener("transitionend", removeAll, { once: true })
      },
      { once: true },
    )
  }
}

// System theme changes use the same animated transition as the manual switcher.
// This runs once at module load and stays active for the lifetime of the page,
// replacing the plain class-toggle listener that was previously in index.html.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  const stored = (localStorage.getItem(THEME_KEY) as ThemePreference) ?? "system"
  if (stored !== "system") return
  const currentIsDark = document.documentElement.classList.contains("dark")
  if (!currentIsDark && e.matches) {
    playThemeTransition("to-dark", "system")
  } else if (currentIsDark && !e.matches) {
    playThemeTransition("to-light", "system")
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
      playThemeTransition("to-dark", pref)
    } else if (currentIsDark && !nextIsDark) {
      playThemeTransition("to-light", pref)
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
