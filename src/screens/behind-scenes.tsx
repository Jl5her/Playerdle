import { useState } from "react"
import { getAbbrByTeamName } from "@/data/teams"
import { getDailyPlayer } from "@/utils/daily"
import fantasyConfig from "@/data/fantasy-config.json"
import { fantasyPlayers } from "@/data/players"

interface Props {
  onBack: () => void
}

// Fantasy Rankings Scraping Configuration (loaded from shared config)
const FANTASY_POSITIONS = fantasyConfig.positions

export default function BehindScenes({ onBack }: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // Get first day of current month
  const firstDay = new Date(currentYear, currentMonth, 1)
  const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

  // Get number of days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Build calendar grid
  const calendarDays = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const player = getDailyPlayer(date)
    const isToday = date.toDateString() === today.toDateString()
    calendarDays.push({
      day,
      date,
      player,
      isToday,
    })
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-5 max-w-6xl mx-auto flex-1 overflow-y-auto">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-wider text-primary-900 dark:text-primary-50">
          Behind the Scenes 🎬
        </h2>
        <p className="text-xs text-primary-500 dark:text-primary-200 mt-1">{dateStr}</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={goToPreviousMonth}
          className="px-4 py-2 text-sm font-bold bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-primary-50 border-none rounded cursor-pointer hover:opacity-80 transition-opacity"
        >
          ← Prev
        </button>
        <div className="flex flex-col items-center">
          <p className="text-lg font-bold text-primary-900 dark:text-primary-50">{monthName}</p>
          <button
            onClick={goToToday}
            className="text-xs text-accent-500 dark:text-accent-400 hover:underline cursor-pointer bg-transparent border-none mt-1"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="px-4 py-2 text-sm font-bold bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-primary-50 border-none rounded cursor-pointer hover:opacity-80 transition-opacity"
        >
          Next →
        </button>
      </div>

      {/* Fantasy Scraping Info */}
      <div className="w-full max-w-5xl bg-secondary-50 dark:bg-secondary-900 border-2 border-secondary-300 dark:border-secondary-700 rounded-lg p-4">
        <h3 className="text-sm font-bold text-primary-900 dark:text-primary-50 mb-2">
          Fantasy Player Pool ({fantasyPlayers.length} players)
        </h3>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {Object.entries(FANTASY_POSITIONS).map(([pos, count]) => {
            const actualCount = fantasyPlayers.filter(p => p.position === pos).length
            return (
              <div
                key={pos}
                className="flex justify-between items-center bg-primary-100 dark:bg-primary-800 px-2 py-1 rounded"
              >
                <span className="font-bold text-primary-900 dark:text-primary-50">{pos}:</span>
                <span className="text-primary-600 dark:text-primary-300">
                  {actualCount}/{count}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-primary-500 dark:text-primary-400 mt-2 italic">
          Scraped from FantasyPros top rankings • Updated periodically
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="w-full max-w-5xl">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div
              key={day}
              className="text-center text-xs font-bold text-primary-700 dark:text-primary-300 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayData, idx) => {
            if (!dayData) {
              return <div key={`empty-${idx}`} className="aspect-square" />
            }

            const { day, player, isToday } = dayData

            // Team is already an abbreviation
            const teamAbbr = getAbbrByTeamName(player.team) || ""

            return (
              <div
                key={idx}
                className={`aspect-square border-2 rounded-lg p-2 flex flex-col justify-between ${isToday
                  ? "border-accent-500 dark:border-accent-400 bg-accent-50 dark:bg-accent-900/20"
                  : "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-sm font-bold ${isToday
                      ? "text-accent-600 dark:text-accent-300"
                      : "text-primary-900 dark:text-primary-50"
                      }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-xs font-bold text-accent-500 dark:text-accent-400">●</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-xs font-semibold text-primary-900 dark:text-primary-50 leading-tight line-clamp-2">
                    {player.name}
                  </span>
                  <span className="text-[10px] text-primary-500 dark:text-primary-200">
                    {teamAbbr} {player.position} #{player.number}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button
        className="mt-4 px-6 py-2 text-sm font-bold bg-success-500 dark:bg-success-400 text-primary-50 dark:text-primary-900 border-none rounded cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onBack}
      >
        Back to Menu
      </button>
    </div>
  )
}
