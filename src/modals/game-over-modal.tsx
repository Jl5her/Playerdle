import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { evaluateColumn, type Player, type SportConfig } from "@/sports"
import type { GameMode } from "@/screens/game"
import { calculateStats } from "@/utils/stats"

interface Props {
  player: Player
  won: boolean
  lost: boolean
  guessCount: number
  onPlayAgain?: () => void
  mode: GameMode
  guesses: Player[]
  isOpen: boolean
  onClose: () => void
  sport: SportConfig
}

function getTeamColors(sport: SportConfig, player: Player): [string, string] {
  const teamValue = String(player.team ?? "")
  const teamAbbrValue = String(player.teamAbbr ?? "")
  const team = sport.teams.find(t => t.name === teamValue || t.abbr === teamAbbrValue)
  return team?.colors ?? ["#538d4e", "#b59f3b"]
}

function generateShareText(
  guesses: Player[],
  answer: Player,
  won: boolean,
  sport: SportConfig,
): string {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date())
  const result = won ? `${guesses.length}/6` : "X/6"

  let text = `Playerdle ${sport.displayName} ${dateStr} ${result}\n\n`

  for (const guess of guesses) {
    text += `${sport.columns
      .map(column => {
        const evaluated = evaluateColumn(guess, answer, column)
        if (evaluated.status === "correct") return "🟩"
        if (evaluated.status === "close") return "🟨"
        return "⬜"
      })
      .join("")}\n`
  }

  return text.trim()
}

export default function GameOverModal({
  player,
  won,
  lost,
  guessCount,
  onPlayAgain,
  mode,
  guesses,
  isOpen,
  onClose,
  sport,
}: Props) {
  const [copied, setCopied] = useState(false)
  const stats = mode === "daily" ? calculateStats(sport.id) : null
  const maxGuessCount = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  async function handleShare() {
    const shareText = generateShareText(guesses, player, won, sport)

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  useEffect(() => {
    if (!won) return

    const duration = 3000
    const end = Date.now() + duration
    const colors = getTeamColors(sport, player)

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0 },
        colors: colors,
        zIndex: 2000,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0 },
        colors: colors,
        zIndex: 2000,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [won, player, sport])

  if (!won && !lost) return null
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-1000 p-4">
      <div
        className="bg-primary-50 dark:bg-primary-900 rounded-lg max-w-lg w-full border-2 border-primary-300 dark:border-primary-700 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 bg-transparent border-none text-primary-500 dark:text-primary-200 text-2xl cursor-pointer p-1 leading-none transition-colors z-10 hover:text-primary-900 dark:hover:text-primary-50"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="text-center px-6 py-8">
          {mode === "daily" ? (
            <>
              <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-4 mt-0 uppercase text-left">
                Statistics
              </h2>
            </>
          ) : (
            <>
              {won ? (
                <>
                  <div className="text-5xl mb-2">&#127942;</div>
                  <div className="text-2xl font-black text-primary-900 dark:text-primary-50 uppercase">
                    {String(player.name)}
                  </div>
                  <div className="text-sm text-primary-500 dark:text-primary-200 mt-2 uppercase">
                    {String(player.team ?? "")} &middot; {String(player.position ?? "")} &middot; #
                    {String(player.number ?? "")}
                  </div>
                  <div className="text-base text-success-500 dark:text-success-400 font-bold mt-3 uppercase">
                    Guessed in {guessCount}/6
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-primary-500 dark:text-primary-200 mb-2 uppercase">
                    The answer was
                  </div>
                  <div className="text-2xl font-black text-primary-900 dark:text-primary-50 uppercase">
                    {String(player.name)}
                  </div>
                  <div className="text-sm text-primary-500 dark:text-primary-200 mt-2 uppercase">
                    {String(player.team ?? "")} &middot; {String(player.position ?? "")} &middot; #
                    {String(player.number ?? "")}
                  </div>
                  <div className="text-base text-success-500 dark:text-success-400 font-bold mt-3 uppercase">
                    Better luck tomorrow!
                  </div>
                </>
              )}
            </>
          )}

          {mode === "daily" && stats && (
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                    {stats.played}
                  </div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                    Played
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                    {stats.winPercentage}
                  </div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                    Win %
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                    {stats.currentStreak}
                  </div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                    Current
                    <br />
                    Streak
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                    {stats.maxStreak}
                  </div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                    Max
                    <br />
                    Streak
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase text-left">
                  Guess Distribution
                </h3>
                {[1, 2, 3, 4, 5, 6].map(guessNum => {
                  const count = stats.guessDistribution[guessNum] || 0

                  return (
                    <div
                      key={guessNum}
                      className="flex items-center mb-1 gap-2"
                    >
                      <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
                        {guessNum}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <progress
                          className="w-full h-4 rounded-sm overflow-hidden [&::-webkit-progress-bar]:bg-primary-100 [&::-webkit-progress-value]:bg-primary-300 dark:[&::-webkit-progress-bar]:bg-primary-800 dark:[&::-webkit-progress-value]:bg-primary-600"
                          value={count}
                          max={maxGuessCount}
                        />
                        <span className="text-xs font-semibold text-primary-900 dark:text-primary-50 w-6 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-6">
            {mode === "daily" && (
              <button
                className="px-6 py-2.5 text-sm font-bold text-primary-50 dark:text-primary-900 bg-accent-500 dark:bg-accent-400 border-none rounded cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
                onClick={handleShare}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="15"
                  ></line>
                </svg>
                {copied ? "Copied!" : "Share"}
              </button>
            )}
            {onPlayAgain && (
              <button
                className="px-6 py-2.5 text-sm font-bold text-primary-50 dark:text-primary-900 bg-success-500 dark:bg-success-400 border-none rounded cursor-pointer uppercase hover:opacity-90 transition-opacity"
                onClick={onPlayAgain}
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
