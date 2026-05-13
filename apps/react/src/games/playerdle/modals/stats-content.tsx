import type { GameMode } from "@/games/playerdle/screens/game"
import { evaluateColumn, type Player, type SportConfig } from "@/games/playerdle/sports"
import { calculateStats } from "@/games/playerdle/utils/stats"
import { PlayAgainButton, Popup, ShareButton } from "@/shared/components"
import { useClipboardShare } from "@/shared/hooks/use-clipboard-share"
import { shortenUrl } from "@/shared/utils/shorten-url"

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
  const SCOUTING_RANKS: Record<number, string> = {
    1: "Elite Prospect 🎯",
    2: "High Upside 📈",
    3: "Raw Talent 💎",
    4: "Needs Development 🛠️",
    5: "Long Shot 🎲",
    6: "Camp Body ⛺",
  }
  const rank = won ? (SCOUTING_RANKS[guesses.length] ?? "Raw Talent 💎") : "Waived 📤"

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
  mode,
  guesses = [],
  sport,
  showStatsOnly = false,
  includeShareButton = false,
  variantId,
}: StatsContentProps) {
  const { share, copied } = useClipboardShare()
  const stats = mode === "daily" ? calculateStats(sport.id, variantId) : null
  const maxGuessCount = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

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
          <ShareButton
            copied={copied}
            onClick={handleShare}
          />
        )}
        {onPlayAgain && <PlayAgainButton onClick={onPlayAgain} />}
      </div>
    </div>
  )
}
