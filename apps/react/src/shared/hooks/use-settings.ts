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

    if (direction === "to-dark") {
      // Solid black backdrop — visible in the areas the white overlay is clipped away,
      // simulating the dark bezel of a CRT as the screen collapses.
      const backdrop = document.createElement("div")
      Object.assign(backdrop.style, {
        position: "fixed",
        inset: "0",
        zIndex: "99998",
        background: "black",
        pointerEvents: "none",
      })
      document.body.appendChild(backdrop)
      created.push(backdrop)

      // White overlay that collapses like a CRT screen turning off.
      const overlay = document.createElement("div")
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "99999",
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
      // White overlay that flickers like a fluorescent tube turning on.
      // Animation ends at opacity 1; JS fades it out after applying the theme.
      const overlay = document.createElement("div")
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "99999",
        background: "white",
        pointerEvents: "none",
        opacity: "0",
      })
      overlay.classList.add("theme-transition-flicker")
      document.body.appendChild(overlay)
      created.push(overlay)

      overlay.addEventListener(
        "animationend",
        () => {
          // Light mode is applied by the caller immediately after this resolves,
          // while the overlay is still at full opacity — hiding the instant switch.
          resolve()
          // Then smoothly fade the overlay out to reveal the new light theme.
          overlay.style.transition = "opacity 350ms ease-out"
          overlay.style.opacity = "0"
          overlay.addEventListener("transitionend", removeAll, { once: true })
        },
        { once: true },
      )
    }
  })
}

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
