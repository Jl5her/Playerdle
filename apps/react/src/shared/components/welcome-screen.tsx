import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
  faMap,
  faMoon,
  faRoute,
  faSun,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useState } from "react"

const WELCOME_SEEN_KEY = "playerdle-welcome-seen"

export function hasSeenWelcome(): boolean {
  return !!localStorage.getItem(WELCOME_SEEN_KEY)
}

function markWelcomeSeen() {
  localStorage.setItem(WELCOME_SEEN_KEY, "true")
}

interface WelcomeScreenProps {
  onDismiss: () => void
}

export default function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Defer to next frame so CSS transition fires
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleDismiss() {
    markWelcomeSeen()
    onDismiss()
  }

  const sportTabs = [
    { icon: faFootball, label: "NFL" },
    { icon: faBaseball, label: "MLB" },
    { icon: faBasketball, label: "NBA" },
    { icon: faHockeyPuck, label: "NHL" },
    { icon: faMap, label: "Statehue" },
  ]

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex flex-col bg-primary-50 dark:bg-primary-900 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-5 pt-10 pb-6 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-wide text-primary-700 dark:text-primary-50">
              PLAYERDLE
            </h1>
            <p className="mt-2 text-base text-primary-500 dark:text-primary-300">
              Sports guessing games — one new puzzle every day.
            </p>
          </div>

          {/* Game modes */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 dark:text-primary-500">
              Game Modes
            </h2>

            <Card
              icon={faFootball}
              title="Playerdle"
              description="Guess the mystery player in 6 tries. Each guess reveals color-coded clues across stat and team columns."
            />

            <Card
              icon={faRoute}
              title="Journeyman"
              description="Trace a player's career path team by team. How quickly can you map their journey across the league?"
            />

            <Card
              icon={faMap}
              title="Statehue"
              description="Identify a US state from its sports teams' colors alone. Available for NFL, MLB, NBA, and NHL."
            />
          </div>

          {/* Daily vs Arcade */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 dark:text-primary-500">
              Play Styles
            </h2>

            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon
                    icon={faSun}
                    className="text-warning-500 dark:text-warning-400 text-base"
                  />
                  <span className="font-bold text-sm text-primary-700 dark:text-primary-100">
                    Daily
                  </span>
                </div>
                <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                  Everyone gets the same puzzle. A new one unlocks at midnight — build your streak!
                </p>
              </div>

              <div className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon
                    icon={faTrophy}
                    className="text-success-500 dark:text-success-400 text-base"
                  />
                  <span className="font-bold text-sm text-primary-700 dark:text-primary-100">
                    Arcade
                  </span>
                </div>
                <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                  Random players, no limits. Practice and sharpen your knowledge anytime.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-primary-100 dark:bg-primary-800 px-4 py-3 flex items-start gap-3">
              <FontAwesomeIcon
                icon={faMoon}
                className="text-primary-400 dark:text-primary-400 mt-0.5 text-sm shrink-0"
              />
              <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                Daily answers are shared worldwide — no spoilers! A fresh puzzle drops at{" "}
                <strong className="text-primary-700 dark:text-primary-200">midnight local time</strong>{" "}
                each night.
              </p>
            </div>
          </div>

          {/* Sport tabs */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 dark:text-primary-500">
              Sport Tabs
            </h2>
            <div className="rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
              <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed mb-3">
                The bar at the bottom switches between sports. Each sport has its own independent
                daily puzzle and stat columns.
              </p>
              <div className="flex items-center justify-center gap-4">
                {sportTabs.map(tab => (
                  <div
                    key={tab.label}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center text-primary-600 dark:text-primary-300">
                      <FontAwesomeIcon
                        icon={tab.icon}
                        className="text-lg"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                      {tab.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 w-full max-w-md mx-auto px-5 py-4 border-t border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900">
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3.5 rounded-xl bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 font-black text-base tracking-wide hover:bg-primary-600 dark:hover:bg-primary-100 transition-colors cursor-pointer"
        >
          Start Playing
        </button>
      </div>
    </div>
  )
}

interface CardProps {
  icon: typeof faFootball
  title: string
  description: string
}

function Card({ icon, title, description }: CardProps) {
  return (
    <div className="rounded-xl bg-primary-100 dark:bg-primary-800 p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg bg-primary-200 dark:bg-primary-700 flex items-center justify-center text-primary-600 dark:text-primary-300 shrink-0 mt-0.5">
        <FontAwesomeIcon
          icon={icon}
          className="text-base"
        />
      </div>
      <div>
        <p className="font-bold text-sm text-primary-700 dark:text-primary-100 mb-1">{title}</p>
        <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
