import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"
import type { GameMode } from "@/games/playerdle/screens/game"
import { evaluateColumn, type Player, type SportConfig } from "@/games/playerdle/sports"
import { calculateStats } from "@/games/playerdle/utils/stats"
import { CountUp, PlayAgainButton, Popup, ShareButton, StatBar } from "@/shared/components"
import { useClipboardShare } from "@/shared/hooks/use-clipboard-share"
import { shortenUrl } from "@/shared/utils/shorten-url"

export interface StatsContentProps {
  player?: Player
  won?: boolean
  lost?: boolean
  guessCount?: number
  onPlayAgain?: () => void
  onViewArchive?: () => void
  mode: GameMode
  guesses?: Player[]
  sport: SportConfig
  showStatsOnly?: boolean
  includeShareButton?: boolean
  variantId?: string
}

function generateShareText(
  guesses: Player[],
  answer: Player,
  won: boolean,
  sport: SportConfig,
  url: string,
): string {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())
  const result = won ? `${guesses.length}/6` : "X/6"
  const variantLabel = sport.activeVariantLabel ? ` ${sport.activeVariantLabel}` : ""
  let text = `Playerdle ${sport.displayName}${variantLabel} (${dateStr}) — ${result}\n\n`

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

  return `${text}\n${url}`.trim()
}

export function StatsContent({
  player,
  won = false,
  lost = false,
  guessCount = 0,
  onPlayAgain,
  onViewArchive,
  mode,
  guesses = [],
  sport,
  showStatsOnly = false,
  includeShareButton = false,
  variantId,
}: StatsContentProps) {
  const [hideAnswer, setHideAnswer] = useState(false)
  const { share, copied } = useClipboardShare()
  const stats = mode === "daily" ? calculateStats(sport.id, variantId) : null
  const maxGuessCount = stats
    ? Math.max(...Object.values<number>(stats.guessDistribution), 1)
    : 1

  async function handleShare() {
    if (!player) return
    const prefix = sport.id === "nfl" ? "" : `/${sport.id}`
    const path = variantId === "fanatic" ? "/fanatic" : "/daily"
    const rawUrl = `${window.location.origin}${prefix}${path}`
    const url = await shortenUrl(rawUrl)
    share({
      title: "Playerdle",
      text: generateShareText(guesses, player, won, sport, url),
    })
  }

  if (!showStatsOnly && !won && !lost) return null

  return (
    <div className="text-center py-6">
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
          <div className="flex items-center justify-center gap-2">
            <div className="text-xs text-primary-500 dark:text-primary-200 uppercase">
              The answer was
            </div>
            <button
              type="button"
              onClick={() => setHideAnswer(h => !h)}
              aria-label={hideAnswer ? "Show answer" : "Hide answer"}
              className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200 transition-colors"
            >
              <FontAwesomeIcon
                icon={hideAnswer ? faEye : faEyeSlash}
                className="text-xs"
              />
            </button>
          </div>
          <div
            className={`text-2xl font-black text-primary-900 dark:text-primary-50 uppercase transition-[filter] ${hideAnswer ? "blur-sm select-none" : ""}`}
          >
            {String(player.name)}
          </div>
          <div
            className={`text-xs text-primary-500 dark:text-primary-200 mt-1 uppercase transition-[filter] ${hideAnswer ? "blur-sm select-none" : ""}`}
          >
            {String(player.team ?? "")} &middot; {String(player.position ?? "")} &middot; #
            {String(player.number ?? "")}
          </div>
          <div
            className={`text-base font-bold mt-3 uppercase ${
              won ? "text-success-500 dark:text-success-400" : "text-error-500 dark:text-error-400"
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
                <CountUp value={stats.played} />
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                Played
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                <CountUp value={stats.winPercentage} />
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-relaxed font-light">
                Win %
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                <CountUp value={stats.currentStreak} />
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 leading-tight font-light">
                Current
                <br />
                Streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                <CountUp value={stats.maxStreak} />
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
            {[
              ...[1, 2, 3, 4, 5, 6].map(n => ({
                key: String(n),
                label: String(n),
                count: stats.guessDistribution[n] || 0,
                isLoss: false,
                highlight: won && guessCount === n,
              })),
              { key: "X", label: "X", count: stats.losses, isLoss: true, highlight: lost },
            ].map(row => (
              <StatBar
                key={row.key}
                label={row.label}
                count={row.count}
                maxCount={maxGuessCount}
                isLoss={row.isLoss}
                highlight={row.highlight}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center mt-6 flex-wrap">
        {mode === "daily" && includeShareButton && player && (
          <ShareButton
            copied={copied}
            onClick={handleShare}
          />
        )}
        {onPlayAgain && <PlayAgainButton onClick={onPlayAgain} />}
        {mode === "daily" && onViewArchive && (
          <button
            type="button"
            onClick={onViewArchive}
            className="px-4 py-2 text-sm font-semibold text-primary-500 dark:text-primary-200 border border-primary-300 dark:border-primary-700 rounded hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors uppercase tracking-wider"
          >
            View Archive
          </button>
        )}
      </div>
    </div>
  )
}
