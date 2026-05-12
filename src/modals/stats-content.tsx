import confetti from "canvas-confetti"
import { useEffect, useRef, useState } from "react"
import { Popup } from "@/components"
import type { GameMode } from "@/screens/game"
import { evaluateColumn, type Player, type SportConfig } from "@/sports"
import { calculateStats } from "@/utils/stats"

export interface StatsContentProps {
  player?: Player
  won?: boolean
  lost?: boolean
  guessCount?: number
  onPlayAgain?: () => void
  mode: GameMode
  guesses?: Player[]
  sport: SportConfig
  showStatsOnly?: boolean
  includeShareButton?: boolean
  variantId?: string
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

  const variantLabel = sport.activeVariantLabel ? ` ${sport.activeVariantLabel}` : ""
  let text = `Playerdle ${sport.displayName}${variantLabel} ${dateStr} ${result}\n\n`

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

export function StatsContent({
  player,
  won = false,
  lost = false,
  guessCount = 0,
  onPlayAgain,
  mode,
  guesses = [],
  sport,
  showStatsOnly = false,
  includeShareButton = false,
  variantId,
}: StatsContentProps) {
  const [copied, setCopied] = useState(false)
  const lastConfettiKeyRef = useRef<string | null>(null)
  const stats = mode === "daily" ? calculateStats(sport.id, variantId) : null
  const maxGuessCount = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function showCopiedPill() {
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(showCopiedPill)
        .catch(() => legacyCopyToClipboard(text))
      return
    }
    legacyCopyToClipboard(text)
  }

  function legacyCopyToClipboard(text: string) {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      showCopiedPill()
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  function handleShare() {
    if (!player) return
    const shareText = generateShareText(guesses, player, won, sport)
    const shareData: ShareData = { title: "Playerdle", text: shareText }

    const canUseShare =
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(shareData))

    if (canUseShare) {
      navigator.share(shareData).catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return
        console.warn("Web Share failed, falling back to clipboard:", err)
        copyToClipboard(shareText)
      })
      return
    }

    copyToClipboard(shareText)
  }

  useEffect(() => {
    if (!won || !player) return

    const confettiKey = `${sport.id}:${player.id}:${guessCount}`
    if (lastConfettiKeyRef.current === confettiKey) {
      return
    }
    lastConfettiKeyRef.current = confettiKey

    const duration = 1500
    const end = Date.now() + duration
    const colors = getTeamColors(sport, player)

    function frame() {
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 0, y: 0 },
        colors: colors,
        zIndex: 2000,
      })
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 1, y: 0 },
        colors: colors,
        zIndex: 2000,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [won, player, guessCount, sport.id])

  if (!showStatsOnly && !won && !lost) return null

  return (
    <div className="text-center px-6 py-8">
      <Popup
        visible={copied}
        message="Copied to clipboard!"
        durationMs={3000}
      />
      {mode === "daily" ? (
        <>
          <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-4 mt-0 uppercase text-left">
            Statistics
          </h2>
        </>
      ) : player ? (
        <>
          <div className="text-xs text-primary-500 dark:text-primary-200 uppercase">
            The answer was
          </div>
          <div className="text-2xl font-black text-primary-900 dark:text-primary-50 uppercase">
            {String(player.name)}
          </div>
          <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 uppercase">
            {String(player.team ?? "")} &middot; {String(player.position ?? "")} &middot; #
            {String(player.number ?? "")}
          </div>
          <div
            className={`text-base font-bold mt-3 uppercase ${
              won
                ? "text-success-500 dark:text-success-400"
                : "text-error-500 dark:text-error-400"
            }`}
          >
            {won
              ? `You got it in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`
              : "Better luck tomorrow!"}
          </div>
        </>
      ) : null}

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
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight font-light">
                Current
                <br />
                Streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                {stats.maxStreak}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight font-light">
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
              const hasValue = count > 0
              const scaledWidth = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0
              const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`

              return (
                <div
                  key={guessNum}
                  className="flex items-center mb-1 gap-2"
                >
                  <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
                    {guessNum}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end ${
                        hasValue
                          ? "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                          : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300"
                      }`}
                      style={{ width: barWidth }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center mt-6">
        {mode === "daily" && includeShareButton && player && (
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
  )
}
