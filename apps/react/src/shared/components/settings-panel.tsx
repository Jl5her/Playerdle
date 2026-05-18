import { faChevronRight, faMoon, faSun } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { type ThemePreference, useSettings } from "@/shared/hooks/use-settings"

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "Auto" },
  { value: "dark", label: "Dark" },
]

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id: string
  label: string
}

function Toggle({ checked, onChange, id, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        checked
          ? "bg-primary-600 dark:bg-primary-400"
          : "bg-primary-200 dark:bg-primary-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export default function SettingsPanel({ onOpenSync }: { onOpenSync: () => void }) {
  const { theme, setTheme, colorblind, setColorblind } = useSettings()

  return (
    <div className="-mt-1 flex-1 overflow-auto pb-4">
      <div className="flex flex-col gap-6 pt-2">
        {/* Appearance section */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500 dark:text-primary-400">
            Appearance
          </h3>

          {/* Theme switcher */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-200">
              <FontAwesomeIcon
                icon={theme === "dark" ? faMoon : faSun}
                className="text-base text-primary-500 dark:text-primary-400 w-4"
                aria-hidden="true"
              />
              Theme
            </div>
            <div
              className="flex rounded-lg overflow-hidden border-2 border-primary-200 dark:border-primary-700"
              role="group"
              aria-label="Theme preference"
            >
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    theme === opt.value
                      ? "bg-primary-700 text-primary-50 dark:bg-primary-200 dark:text-primary-900"
                      : "bg-transparent text-primary-600 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colorblind toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-200">
                Colorblind-Friendly Colors
              </span>
              <span className="text-xs text-primary-500 dark:text-primary-400">
                {colorblind ? "Blue / Amber / Gray" : "Green / Amber / Red"}
              </span>
            </div>
            <Toggle
              id="colorblind-toggle"
              checked={colorblind}
              onChange={setColorblind}
              label="Toggle colorblind-friendly colors"
            />
          </div>
        </section>

        <hr className="border-primary-200 dark:border-primary-700" />

        {/* Sync sub-menu entry */}
        <button
          type="button"
          onClick={onOpenSync}
          className="flex items-center justify-between w-full text-left py-1 group"
          aria-label="Open sync devices settings"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-200 group-hover:text-primary-900 dark:group-hover:text-primary-50 transition-colors">
              Sync Devices
            </span>
            <span className="text-xs text-primary-500 dark:text-primary-400">
              Link your progress across devices
            </span>
          </div>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="text-sm text-primary-400 dark:text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors shrink-0"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  )
}
