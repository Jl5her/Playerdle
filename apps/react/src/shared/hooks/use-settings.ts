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
    applyTheme(pref)
  }, [])

  const setHighContrast = useCallback((enabled: boolean) => {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled))
    setHighContrastState(enabled)
    applyHighContrast(enabled)
  }, [])

  return { theme, setTheme, highContrast, setHighContrast }
}
