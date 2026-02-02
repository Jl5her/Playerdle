import { useState } from "react"

interface Props {
  isOpen: boolean
  onStart: (settings: ArcadeSettings) => void
  onClose: () => void
  initialSettings: ArcadeSettings
}

export interface ArcadeSettings {
  includeDefensiveST: boolean
}

const DONT_SHOW_KEY = "playerdle-arcade-settings-dont-show"

export function shouldShowArcadeSettings(): boolean {
  return !localStorage.getItem(DONT_SHOW_KEY)
}

export default function ArcadeSettingsModal({ isOpen, onStart, onClose, initialSettings }: Props) {
  const [includeDefensiveST, setIncludeDefensiveST] = useState(initialSettings.includeDefensiveST)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  if (!isOpen) return null

  function handleStart() {
    if (dontShowAgain) {
      localStorage.setItem(DONT_SHOW_KEY, "true")
    }
    onStart({ includeDefensiveST })
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-1000 p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-50 dark:bg-primary-900 rounded-lg max-w-md w-full border-2 border-primary-300 dark:border-primary-700 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 bg-transparent border-none text-primary-500 dark:text-primary-200 text-2xl cursor-pointer p-1 leading-none transition-colors z-10 hover:text-primary-900 dark:hover:text-primary-50"
          onClick={onClose}
          aria-label="Close settings"
        >
          ✕
        </button>

        <div className="px-6 py-8">
          <h2 className="text-2xl font-black tracking-wider text-primary-900 dark:text-primary-50 text-center mb-6">
            Arcade Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="include-dst"
                checked={includeDefensiveST}
                onChange={(e) => setIncludeDefensiveST(e.target.checked)}
                className="mt-1 w-5 h-5 cursor-pointer accent-accent-500 dark:accent-accent-400"
              />
              <label htmlFor="include-dst" className="flex-1 cursor-pointer">
                <div className="text-base font-semibold text-primary-900 dark:text-primary-50">
                  Include D/ST Players
                </div>
                <div className="text-sm text-primary-500 dark:text-primary-200 mt-1">
                  Add Kickers, Defensive Linemen, Linebackers, and Defensive Backs to the player pool
                </div>
              </label>
            </div>

            <div className="border-t border-primary-300 dark:border-primary-700 pt-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="dont-show"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-accent-500 dark:accent-accent-400"
                />
                <label htmlFor="dont-show" className="text-sm text-primary-500 dark:text-primary-200 cursor-pointer">
                  Don't show this again
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full mt-6 px-6 py-3 text-base font-bold bg-success-500 dark:bg-success-400 text-primary-50 dark:text-primary-900 border-none rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
}
