import { getCollegePalette } from "@playerdle/data/journeyman/college-colors"
import { getLeagueJourneyData, TEAM_COLOR_NAME_MAP } from "@playerdle/data/journeyman/leagues"
import mlbPlayers from "@playerdle/data/playerdle/mlb/players.json"
import nbaPlayers from "@playerdle/data/playerdle/nba/players.json"
import nflPlayers from "@playerdle/data/playerdle/nfl/players.json"
import nhlPlayers from "@playerdle/data/playerdle/nhl/players.json"
import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { hexToColorName } from "@/shared/utils/color-name"
import {
  calculateJourneyStats,
  getArcadeJourneyPuzzle,
  getDailyJourneyPuzzle,
  getJourneyPuzzleByDateKey,
  type JourneyLeague,
  type JourneyPuzzle,
  type JourneyStats,
  markJourneyDailyPlayed,
  saveJourneyResult,
} from "@/games/journeyman/utils/journey-daily"
import {
  DailyGameShell,
  PlayAgainButton,
  Popup,
  ResultBanner,
  ScrollHint,
  ShareButton,
} from "@/shared/components"
import { useClipboardShare } from "@/shared/hooks/use-clipboard-share"
import { useWinConfetti } from "@/shared/hooks/use-win-confetti"
import { shortenUrl } from "@/shared/utils/shorten-url"
import { getTodayKey } from "@/shared/utils/time"
import { trackGameComplete } from "@/lib/analytics"

const MAX_GUESSES = 5
const STORAGE_KEY_PREFIX = "playerdle-journey-state:v1"

export type JourneyGameMode = "daily" | "arcade"

interface Props {
  league: JourneyLeague
  mode: JourneyGameMode
  onModeChange?: (mode: JourneyGameMode) => void
  /**
   * When set, plays the daily puzzle for this past date. Result is saved with
   * an archive flag so it doesn't count toward streaks.
   */
  archiveDateKey?: string
}

interface PlayerOption {
  name: string
  position: string
}

// Per-league active-roster autocomplete pool. Add new leagues by adding their
// playerdle/{league}/players.json import here.
const LEAGUE_PLAYER_SOURCES: Record<
  JourneyLeague,
  Array<{ name: string; position: string }>
> = {
  nfl: nflPlayers as Array<{ name: string; position: string }>,
  mlb: mlbPlayers as Array<{ name: string; position: string }>,
  nba: nbaPlayers as Array<{ name: string; position: string }>,
  nhl: nhlPlayers as Array<{ name: string; position: string }>,
}

function buildAutocompletePool(league: JourneyLeague): PlayerOption[] {
  const data = getLeagueJourneyData(league)
  const eligibleSet = new Set(data.eligiblePositions)
  const byName = new Map<string, PlayerOption>()
  for (const p of LEAGUE_PLAYER_SOURCES[league] ?? []) {
    if (!eligibleSet.has(p.position)) continue
    byName.set(p.name.toLowerCase(), { name: p.name, position: p.position })
  }
  for (const j of data.eligiblePlayers) {
    if (!byName.has(j.name.toLowerCase())) {
      byName.set(j.name.toLowerCase(), { name: j.name, position: j.position })
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function storageKey(league: JourneyLeague, dateKey: string): string {
  return `${STORAGE_KEY_PREFIX}:${league}:${dateKey}`
}

function loadDailyGuesses(league: JourneyLeague, dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(league, dateKey))
    if (!raw) return []
    // Per-date storage stores the array directly. Older versions wrapped it
    // in { dateKey, guesses } — accept either shape so in-flight games from
    // before this layout change keep working.
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed?.guesses) ? parsed.guesses : []
  } catch {
    return []
  }
}

function saveDailyGuesses(league: JourneyLeague, dateKey: string, guesses: string[]) {
  localStorage.setItem(storageKey(league, dateKey), JSON.stringify(guesses))
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))))
  const toHex = (c: number) => c.toString(16).padStart(2, "0")
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`
}

function diamondBorder(hex: string): string {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return shadeHex(hex, -0.25)
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2
  return shadeHex(hex, l < 0.18 ? 0.5 : -0.25)
}

function PositionDiamond({ position }: { position: string }) {
  return (
    <span className="relative inline-block w-12 h-12 rotate-45 rounded-md border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900">
      <span className="absolute inset-0 -rotate-45 flex items-center justify-center text-sm font-black tracking-wider text-primary-900 dark:text-primary-50">
        {position}
      </span>
    </span>
  )
}

function FlipDiamond({
  color,
  revealed,
  delayMs,
}: {
  color: string
  revealed: boolean
  delayMs: number
}) {
  const isTransparent = color === "transparent"
  const displayColor = color
  const border = isTransparent ? "#a0a0a0" : diamondBorder(displayColor)
  const frontStyle: React.CSSProperties = { transitionDelay: `${delayMs}ms` }
  const backStyle: React.CSSProperties = isTransparent
    ? { borderColor: border, transitionDelay: `${delayMs + 300}ms` }
    : { backgroundColor: displayColor, borderColor: border, transitionDelay: `${delayMs + 300}ms` }
  return (
    <span
      className={clsx("flip-diamond", revealed ? "revealed" : "")}
      aria-hidden="true"
    >
      <span
        className="flip-diamond-face flip-diamond-front bg-primary-200 dark:bg-primary-700 border-primary-300 dark:border-primary-700"
        style={frontStyle}
      />
      <span
        className={clsx("flip-diamond-face flip-diamond-back", isTransparent && "diamond-transparent")}
        style={backStyle}
      />
    </span>
  )
}

function FlipDiamondWithPreview({
  color,
  revealed,
  delayMs,
}: {
  color: string
  revealed: boolean
  delayMs: number
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number>(0)
  const ref = useRef<HTMLDivElement>(null)
  const isTransparent = color === "transparent"
  const displayColor = color

  useEffect(() => {
    if (!open) return
    function onOutside(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onOutside)
    return () => document.removeEventListener("pointerdown", onOutside)
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  function show() {
    if (!revealed) return
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function hide() {
    closeTimer.current = window.setTimeout(() => setOpen(false), 80)
  }

  return (
    <div
      ref={ref}
      className={clsx("relative", revealed && "cursor-pointer select-none")}
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerUp={e => {
        if (e.pointerType === "touch" && revealed) setOpen(v => !v)
      }}
    >
      <FlipDiamond
        color={color}
        revealed={revealed}
        delayMs={delayMs}
      />
      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-xl shadow-xl px-5 pt-5 pb-4 flex flex-col items-center gap-3"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <span
            aria-hidden="true"
            className={clsx("inline-block w-10 h-10 rounded-[4px] rotate-45 shadow-md", isTransparent && "diamond-transparent")}
            style={isTransparent ? { border: "2px solid #a0a0a0" } : { backgroundColor: displayColor, border: `2px solid ${diamondBorder(displayColor)}` }}
          />
          {!isTransparent && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-500 dark:text-primary-300 whitespace-nowrap">
              {TEAM_COLOR_NAME_MAP.get(color.toLowerCase()) ?? hexToColorName(color)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function LadderRow({
  name,
  palette,
  revealed,
  showName = false,
}: {
  name: string
  palette: [string, string, string]
  revealed: boolean
  showName?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-3">
      {showName && (
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary-500 dark:text-primary-200">
          {name}
        </span>
      )}
      <div className="flex items-center justify-center gap-5">
        {palette.map((c, i) => (
          <FlipDiamondWithPreview
            key={`${c}-${i}`}
            color={c}
            revealed={revealed}
            delayMs={i * 180}
          />
        ))}
      </div>
    </div>
  )
}

interface GuessSlotsProps {
  guesses: string[]
  answerName: string
  targetPosition: string
  maxGuesses: number
  autocompletePool: PlayerOption[]
  hideAnswer?: boolean
}

function GuessSlots({
  guesses,
  answerName,
  targetPosition,
  maxGuesses,
  autocompletePool,
  hideAnswer = false,
}: GuessSlotsProps) {
  const slotRefs = useRef<Array<HTMLDivElement | null>>([])
  const latestIndex = guesses.length - 1

  useEffect(() => {
    if (latestIndex < 0) return
    const el = slotRefs.current[latestIndex]
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex])

  return (
    <div className="flex flex-col items-center gap-2">
      {Array.from({ length: maxGuesses }).map((_, i) => {
        const guess = guesses[i]
        const isCorrect = guess?.toLowerCase() === answerName.toLowerCase()
        const position = guess
          ? autocompletePool.find(p => p.name.toLowerCase() === guess.toLowerCase())?.position
          : undefined
        const positionMatches = !!position && position === targetPosition
        const tone = !guess
          ? "bg-transparent border-primary-300 dark:border-primary-700 text-primary-300 dark:text-primary-600"
          : isCorrect
            ? "bg-success-500/20 border-success-500/60 text-success-500 dark:text-success-400"
            : positionMatches
              ? "bg-warning-500/20 border-warning-500/60 text-warning-600 dark:text-warning-300"
              : "bg-error-500/20 border-error-500/60 text-error-500 dark:text-error-400"
        return (
          <div
            key={i}
            ref={el => {
              slotRefs.current[i] = el
            }}
            className={clsx(
              "relative w-full max-w-xs px-3 py-2 rounded-lg border-2 uppercase font-bold tracking-wider text-sm transition-colors",
              tone,
            )}
          >
            <span className={clsx("block text-center transition-[filter,opacity] duration-200", hideAnswer && isCorrect && "blur select-none opacity-40")}>{guess ?? "—"}</span>
            {position && (
              <span className={clsx("absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-70 transition-[filter,opacity] duration-200", hideAnswer && isCorrect && "blur select-none opacity-40")}>
                {position}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface PlayerInputProps {
  onGuess: (name: string) => void
  disabled: boolean
  usedGuesses: Set<string>
  autocompletePool: PlayerOption[]
}

function PlayerInput({ onGuess, disabled, usedGuesses, autocompletePool }: PlayerInputProps) {
  const [query, setQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const fuse = useMemo(
    () =>
      new Fuse(autocompletePool, {
        keys: ["name"],
        threshold: 0.35,
        distance: 50,
      }),
    [autocompletePool],
  )

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    if (!trimmed) return []
    const q = trimmed.toLowerCase()
    const seen = new Set<string>()
    const result: PlayerOption[] = []

    for (const p of autocompletePool) {
      if (usedGuesses.has(p.name.toLowerCase())) continue
      if (p.name.toLowerCase().startsWith(q)) {
        result.push(p)
        seen.add(p.name.toLowerCase())
        if (result.length >= 8) break
      }
    }
    if (result.length < 8) {
      for (const r of fuse.search(trimmed, { limit: 16 })) {
        const key = r.item.name.toLowerCase()
        if (seen.has(key)) continue
        if (usedGuesses.has(key)) continue
        result.push(r.item)
        seen.add(key)
        if (result.length >= 8) break
      }
    }
    return result.slice(0, 8)
  }, [trimmed, usedGuesses, fuse, autocompletePool])

  function handleSelect(option: PlayerOption) {
    onGuess(option.name)
    setQuery("")
    setShowDropdown(false)
    setHighlightIndex(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex(p => Math.min(p + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex(p => Math.max(p - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[highlightIndex]) handleSelect(filtered[highlightIndex])
    } else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  if (disabled) return null

  return (
    <div className="shrink-0 mx-3 mb-3 pb-[max(0rem,env(safe-area-inset-bottom))] bg-primary-50 dark:bg-primary-900">
      <div className="relative max-w-xs mx-auto">
        <input
          ref={inputRef}
          type="text"
          name="player-search"
          value={query}
          onChange={e => {
            setQuery(e.currentTarget.value)
            setShowDropdown(true)
            setHighlightIndex(0)
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
          onBlur={() => setShowDropdown(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type a player name..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-primary-300 bg-secondary-50 text-primary-900 outline-none dark:bg-secondary-900 dark:text-primary-50 dark:border-primary-700"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="search"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-30 dark:bg-secondary-900 dark:border-primary-700">
            {filtered.map((option, i) => (
              <button
                key={option.name}
                className={clsx(
                  "flex justify-between items-center w-full px-3 py-2 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50",
                  i === highlightIndex
                    ? "bg-primary-100 dark:bg-primary-800"
                    : "hover:bg-primary-50 dark:hover:bg-primary-900",
                )}
                onPointerDown={e => {
                  e.preventDefault()
                  handleSelect(option)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <span className="font-semibold text-sm">{option.name}</span>
                <span className="text-xs text-primary-500 dark:text-primary-200 ml-2">
                  {option.position}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResultsPanelProps {
  league: JourneyLeague
  puzzle: JourneyPuzzle
  guesses: string[]
  won: boolean
  maxGuesses: number
  mode: JourneyGameMode
  stats: JourneyStats | null
  autocompletePool: PlayerOption[]
  onClose: () => void
  onPlayAgain: () => void
}

function buildShareText(
  league: JourneyLeague,
  puzzle: JourneyPuzzle,
  guesses: string[],
  won: boolean,
  maxGuesses: number,
  url: string,
  autocompletePool: PlayerOption[],
): string {
  const score = won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const answerName = puzzle.player.name.toLowerCase()
  const targetPos = puzzle.player.position
  const emojiRow = Array.from({ length: maxGuesses }, (_, i) => {
    const guess = guesses[i]
    if (!guess) return "⬜"
    if (guess.toLowerCase() === answerName) return "🟩"
    const pos = autocompletePool.find(p => p.name.toLowerCase() === guess.toLowerCase())?.position
    if (pos === targetPos) return "🟨"
    return "🟥"
  }).join("")

  const label = league.toUpperCase()
  return `Journeyman ${label} (${dateStr}) — ${score}\n${emojiRow}\n\n${url}`
}

function ResultsPanel({
  league,
  puzzle,
  guesses,
  won,
  maxGuesses,
  mode,
  stats,
  autocompletePool,
  onClose,
  onPlayAgain,
}: ResultsPanelProps) {
  const { share, copied } = useClipboardShare()
  const resultsScrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  async function handleShare() {
    const rawUrl = `${window.location.origin}/journeyman/${league}/daily`
    const url = await shortenUrl(rawUrl)
    share({
      title: "Journeyman",
      text: buildShareText(league, puzzle, guesses, won, maxGuesses, url, autocompletePool),
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pb-4">
      <Popup
        visible={copied}
        message="Copied to clipboard!"
        durationMs={3000}
      />

      <div
        ref={resultsScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 mt-4 w-full max-w-2xl mx-auto"
      >
        {mode === "daily" && stats && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
              Statistics
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="text-center">
                <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                  {stats.played}
                </div>
                <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light">
                  Played
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                  {stats.winPercentage}
                </div>
                <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light">
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

            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
              Guess Distribution
            </h3>
            {[1, 2, 3, 4, 5].map(num => {
              const count = stats.guessDistribution[num] || 0
              const has = count > 0
              const scaledWidth = maxBar > 0 ? (count / maxBar) * 100 : 0
              const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`
              return (
                <div
                  key={num}
                  className="flex items-center mb-1 gap-2"
                >
                  <div className="text-sm font-semibold text-primary-900 dark:text-primary-50 w-4 shrink-0">
                    {num}
                  </div>
                  <div className="flex-1">
                    <div
                      className={clsx(
                        "min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end",
                        has
                          ? "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                          : "bg-primary-100 dark:bg-primary-800 text-primary-500 dark:text-primary-300",
                      )}
                      style={{ width: barWidth }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          {mode === "daily" && (
            <ShareButton
              copied={copied}
              onClick={handleShare}
            />
          )}
          <PlayAgainButton
            onClick={() => {
              onPlayAgain()
              onClose()
            }}
          />
        </div>
      </div>
      <ScrollHint scrollRef={resultsScrollRef} />
    </div>
  )
}

export default function JourneyGame({ league, mode, onModeChange, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<JourneyGameMode>(mode)
  const leagueData = useMemo(() => getLeagueJourneyData(league), [league])
  const autocompletePool = useMemo(() => buildAutocompletePool(league), [league])
  const [puzzle, setPuzzle] = useState<JourneyPuzzle>(() => {
    if (mode === "daily") {
      return archiveDateKey
        ? getJourneyPuzzleByDateKey(league, archiveDateKey)
        : getDailyJourneyPuzzle(league)
    }
    return getArcadeJourneyPuzzle(league)
  })
  // The puzzle's own dateKey is the single source of truth for storage, so
  // in-progress saves and final-result saves always agree even if the puzzle
  // factory ever normalizes the input date.
  const [guesses, setGuesses] = useState<string[]>(() =>
    mode === "daily" ? loadDailyGuesses(league, puzzle.dateKey) : [],
  )

  const answerName = puzzle.player.name
  const won = guesses.some(g => g.toLowerCase() === answerName.toLowerCase())
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const wrongCount = guesses.filter(g => g.toLowerCase() !== answerName.toLowerCase()).length

  const [hideAnswer, setHideAnswer] = useState(false)

  // Reveal cadence: distribute the player's teams evenly across 4 buckets
  // (initial + 3 reveal steps before the final guess). For 4 teams this keeps
  // the old "1 visible at start, +1 per wrong guess" pacing. For 5+ teams the
  // initial reveal is 2 (or 3 for 9+), so the harder cases get a few teams up
  // front and each subsequent reveal flips a roughly-equal batch.
  const REVEAL_STEPS = MAX_GUESSES - 2
  const TOTAL_BUCKETS = REVEAL_STEPS + 1
  const visibleTeamsCount = gameOver
    ? puzzle.player.teams.length
    : Math.min(
        Math.ceil(
          (puzzle.player.teams.length *
            (Math.min(wrongCount, REVEAL_STEPS) + 1)) /
            TOTAL_BUCKETS,
        ),
        puzzle.player.teams.length,
      )

  const gameScrollRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<JourneyStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateJourneyStats(league) : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      // Mark today as played only when this puzzle's date IS today, regardless
      // of how the player got here (via the daily entry point or the archive's
      // "Play this day" on today). Mirrors the archive-flag logic in
      // saveJourneyResult so the daily-played marker stays consistent.
      if (puzzle.dateKey === getTodayKey()) markJourneyDailyPlayed(league)
      saveJourneyResult(league, puzzle.dateKey, won, guesses.length, guesses)
    }
  }, [league, activeMode, gameOver, puzzle.dateKey, won, guesses])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateJourneyStats(league))
    }
  }, [gameOver, activeMode, stats, league])

  function getPaletteOrFallback(teamName: string): [string, string, string] {
    return leagueData.getTeamPalette(teamName) ?? ["#888888", "#bbbbbb", "#dddddd"]
  }

  const confettiColors = useMemo(
    () => puzzle.player.teams.flatMap(t => getPaletteOrFallback(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzle.player.teams, leagueData],
  )
  useWinConfetti({
    won,
    colors: confettiColors,
    dedupKey: `${puzzle.dateKey}:${puzzle.player.id}:${guesses.length}`,
  })

  const usedGuessesLower = useMemo(() => new Set(guesses.map(g => g.toLowerCase())), [guesses])

  const positionRevealed = useMemo(() => {
    if (gameOver) return true
    const targetPos = puzzle.player.position
    return guesses.some(g => {
      const match = autocompletePool.find(p => p.name.toLowerCase() === g.toLowerCase())
      return match?.position === targetPos
    })
  }, [guesses, puzzle.player.position, gameOver, autocompletePool])

  function handleGuess(name: string) {
    if (gameOver) return
    if (usedGuessesLower.has(name.toLowerCase())) return
    const next = [...guesses, name]
    setGuesses(next)
    if (activeMode === "daily") saveDailyGuesses(league, puzzle.dateKey, next)
    const newWon = next.some(g => g.toLowerCase() === answerName.toLowerCase())
    const newLost = !newWon && next.length >= MAX_GUESSES
    if (newWon || newLost) {
      trackGameComplete({ game: "journeyman", sport: league, mode: activeMode, won: newWon, guesses: next.length })
    }
  }

  function handlePlayAgain() {
    const fresh = getArcadeJourneyPuzzle(league, puzzle.player.id)
    setPuzzle(fresh)
    setGuesses([])
    setActiveMode("arcade")
    onModeChange?.("arcade")
  }

  const collegePalette =
    leagueData.hasCollegeRung && puzzle.player.college
      ? getCollegePalette(puzzle.player.college)
      : undefined

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={puzzle.player.name}
      onPlayAgain={handlePlayAgain}
      renderResults={({ onClose, onPlayAgain }) => (
        <ResultsPanel
          league={league}
          puzzle={puzzle}
          guesses={guesses}
          won={won}
          maxGuesses={MAX_GUESSES}
          mode={activeMode}
          stats={stats}
          autocompletePool={autocompletePool}
          onClose={onClose}
          onPlayAgain={onPlayAgain}
        />
      )}
    >
      {gameOver && (
        <ResultBanner
          won={won}
          guessCount={guesses.length}
          answer={puzzle.player.name}
          hideAnswer={hideAnswer}
          onToggleHide={() => setHideAnswer(h => !h)}
        />
      )}
      <div
        ref={gameScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
      >
        <div className="max-w-sm mx-auto px-3 py-4 flex flex-col gap-3">
          <div className="relative rounded-2xl border-2 border-primary-300 dark:border-primary-700 pt-8 px-8 pb-3 mt-6 mx-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <PositionDiamond position={positionRevealed ? puzzle.player.position : "?"} />
            </div>
            <div className="flex flex-col">
              {leagueData.hasCollegeRung && puzzle.player.college && (
                <LadderRow
                  name={puzzle.player.college}
                  palette={collegePalette ?? ["#888888", "#bbbbbb", "#dddddd"]}
                  revealed
                  showName={gameOver && !hideAnswer}
                />
              )}
              {puzzle.player.teams.map((team, i) => (
                <LadderRow
                  key={`${team}-${i}`}
                  name={team}
                  palette={getPaletteOrFallback(team)}
                  revealed={i < visibleTeamsCount}
                  showName={gameOver && !hideAnswer && i < visibleTeamsCount}
                />
              ))}
            </div>
          </div>

          <div className="mt-2">
            <GuessSlots
              guesses={guesses}
              answerName={answerName}
              targetPosition={puzzle.player.position}
              maxGuesses={MAX_GUESSES}
              autocompletePool={autocompletePool}
              hideAnswer={hideAnswer}
            />
          </div>
        </div>
      </div>
      <ScrollHint scrollRef={gameScrollRef} />

      <PlayerInput
        onGuess={handleGuess}
        disabled={gameOver}
        usedGuesses={usedGuessesLower}
        autocompletePool={autocompletePool}
      />
    </DailyGameShell>
  )
}
