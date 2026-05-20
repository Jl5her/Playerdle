import {
  faBaseball,
  faBasketball,
  faChartBar,
  faFootball,
  faHockeyPuck,
  faMap,
  faMoon,
  faRoute,
  faSun,
  faTrophy,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import ScrollHint from "./scroll-hint"

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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleDismiss() {
    markWelcomeSeen()
    setVisible(false)
    setTimeout(onDismiss, 300)
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
        "fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300",
        visible ? "bg-black/50" : "bg-black/0",
      )}
    >
      {/* Sheet */}
      <div
        className={clsx(
          "w-full max-w-lg mx-auto flex flex-col rounded-t-3xl bg-primary-50 dark:bg-primary-900 shadow-2xl transition-transform duration-300",
          "max-h-[92dvh]",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Fixed header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-primary-200 dark:border-primary-700">
          <div>
            <h1 className="text-2xl font-black tracking-wide text-primary-700 dark:text-primary-50">
              PLAYERDLE
            </h1>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
              Sports guessing games — one new puzzle every day.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            title="Close"
            className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors shrink-0 ml-3"
          >
            <FontAwesomeIcon icon={faXmark} className="text-2xl" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 pt-5 pb-8 flex flex-col gap-6">
            {/* Game Modes */}
            <section className="flex flex-col gap-3">
              <SectionHeading>Game Modes</SectionHeading>

              <Card
                icon={faFootball}
                title="Playerdle"
                description="Guess the mystery player in 6 tries using team, position, age, and other stat columns. Color-coded clues narrow it down each round."
              />

              <Card
                icon={faChartBar}
                title="Fanatic Mode"
                accent
                description="A harder stats-based variant of Playerdle. Columns swap to fantasy stats like FPPG, yards per game, and touchdowns — no team or position hints. Available for NFL, MLB, NBA, and NHL."
              />

              <Card
                icon={faRoute}
                title="Journeyman"
                description="Trace a player's career path team by team. Reveal one stop at a time and guess who made the journey."
              />

              <Card
                icon={faMap}
                title="Statehue"
                description="Identify a US state from its sports teams' colors alone. No names — just palettes."
              />
            </section>

            {/* Play Styles */}
            <section className="flex flex-col gap-3">
              <SectionHeading>Play Styles</SectionHeading>

              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon
                      icon={faSun}
                      className="text-warning-500 dark:text-warning-400 text-sm"
                    />
                    <span className="font-bold text-sm text-primary-700 dark:text-primary-100">
                      Daily
                    </span>
                  </div>
                  <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                    One puzzle per day, shared by everyone. Build your streak!
                  </p>
                </div>

                <div className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon
                      icon={faTrophy}
                      className="text-success-500 dark:text-success-400 text-sm"
                    />
                    <span className="font-bold text-sm text-primary-700 dark:text-primary-100">
                      Arcade
                    </span>
                  </div>
                  <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                    Random players, no limits. Practice anytime.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-primary-100 dark:bg-primary-800 px-4 py-3 flex items-start gap-3">
                <FontAwesomeIcon
                  icon={faMoon}
                  className="text-primary-400 dark:text-primary-500 mt-0.5 text-sm shrink-0"
                />
                <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed">
                  Daily puzzles reset at{" "}
                  <strong className="text-primary-700 dark:text-primary-200">
                    midnight local time
                  </strong>{" "}
                  and the same answer is shared worldwide — watch out for spoilers!
                </p>
              </div>
            </section>

            {/* Sport Tabs */}
            <section className="flex flex-col gap-3">
              <SectionHeading>Sport Tabs</SectionHeading>
              <div className="rounded-xl bg-primary-100 dark:bg-primary-800 p-4">
                <p className="text-xs text-primary-500 dark:text-primary-300 leading-relaxed mb-4">
                  Use the tab bar at the bottom to switch sports. Each sport has its own daily
                  puzzle, answer pool, and stat columns.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {sportTabs.map((tab, i) => (
                    <div key={tab.label} className="flex flex-col items-center gap-1">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          i === 0
                            ? "bg-primary-700/10 text-primary-700 ring-1 ring-primary-500/20 dark:bg-primary-200/12 dark:text-primary-100 dark:ring-primary-300/22"
                            : "bg-primary-200 dark:bg-primary-700 text-primary-500 dark:text-primary-300",
                        )}
                      >
                        <FontAwesomeIcon icon={tab.icon} className="text-lg" />
                      </div>
                      <span className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                        {tab.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA — at the bottom of scroll so users read first */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3.5 rounded-xl bg-primary-700 dark:bg-primary-200 text-primary-50 dark:text-primary-900 font-black text-base tracking-wide hover:bg-primary-600 dark:hover:bg-primary-100 transition-colors cursor-pointer"
            >
              Start Playing
            </button>
          </div>
        </div>
        <ScrollHint scrollRef={scrollRef} />
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 dark:text-primary-500">
      {children}
    </h2>
  )
}

interface CardProps {
  icon: typeof faFootball
  title: string
  description: string
  accent?: boolean
}

function Card({ icon, title, description, accent }: CardProps) {
  return (
    <div className="rounded-xl bg-primary-100 dark:bg-primary-800 p-4 flex gap-3 items-start">
      <div
        className={clsx(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          accent
            ? "bg-warning-100 dark:bg-warning-900/40 text-warning-600 dark:text-warning-400"
            : "bg-primary-200 dark:bg-primary-700 text-primary-600 dark:text-primary-300",
        )}
      >
        <FontAwesomeIcon icon={icon} className="text-base" />
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
