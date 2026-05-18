import { useCallback, useState } from "react"

export type ThemePreference = "light" | "dark" | "system"

const THEME_KEY = "playerdle-theme"
const COLORBLIND_KEY = "playerdle-colorblind"

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

export function applyColorblind(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("colorblind")
  } else {
    document.documentElement.classList.remove("colorblind")
  }
}

export function useSettings() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemePreference) ?? "system"
  })
  const [colorblind, setColorblindState] = useState<boolean>(() => {
    return localStorage.getItem(COLORBLIND_KEY) === "true"
  })

  const setTheme = useCallback((pref: ThemePreference) => {
    localStorage.setItem(THEME_KEY, pref)
    setThemeState(pref)
    applyTheme(pref)
  }, [])

  const setColorblind = useCallback((enabled: boolean) => {
    localStorage.setItem(COLORBLIND_KEY, String(enabled))
    setColorblindState(enabled)
    applyColorblind(enabled)
  }, [])

  return { theme, setTheme, colorblind, setColorblind }
}
