import { faLocationArrow } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { ALL_STATES, getStateByName, type USState } from "@playerdle/data/statehue/all-states"
import { bearingDeg } from "@playerdle/data/statehue/state-geo"
import { STATE_PATHS } from "@playerdle/data/statehue/state-paths"
import { type ColorsState, type ColorsTeam } from "@playerdle/data/statehue/states"
import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  type ColorsPuzzle,
  type ColorsStats,
  type ColorsVariant,
  calculateColorsStats,
  getArcadeColorsPuzzle,
  getColorsPuzzleByDateKey,
  getDailyColorsPuzzle,
  markColorsDailyPlayed,
  saveColorsResult,
} from "@/games/statehue/utils/colors-daily"
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
import { hexToColorName } from "@/shared/utils/color-name"
import { shortenUrl } from "@/shared/utils/shorten-url"
import { getTodayKey } from "@/shared/utils/time"

const MAX_GUESSES = 5

function storageKeyFor(variant: ColorsVariant, dateKey: string): string {
  const base =
    variant === "collegiate" ? "playerdle-colors-collegiate-state:v1" : "playerdle-colors-state:v1"
  return `${base}:${dateKey}`
}

export type ColorsGameMode = "daily" | "arcade"

interface Props {
  mode: ColorsGameMode
  variant?: ColorsVariant
  onModeChange?: (mode: ColorsGameMode) => void
  onBackToToday?: () => void
  /**
   * When set, plays the daily puzzle for this past date. Result is saved with
   * an archive flag so it doesn't count toward streaks.
   */
  archiveDateKey?: string
}

function loadDailyGuesses(dateKey: string, variant: ColorsVariant): string[] {
  try {
    const raw = localStorage.getItem(storageKeyFor(variant, dateKey))
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

function saveDailyGuesses(dateKey: string, guesses: string[], variant: ColorsVariant) {
  localStorage.setItem(storageKeyFor(variant, dateKey), JSON.stringify(guesses))
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

function Diamond({ color }: { color: string }) {
  const isTransparent = color === "transparent"
  return (
    <span
      className={clsx("inline-block w-7 h-7 rounded-[3px] rotate-45 shadow-sm", isTransparent && "diamond-transparent")}
      style={isTransparent ? { border: "1px solid #a0a0a0" } : { backgroundColor: color, border: `1px solid ${diamondBorder(color)}` }}
      aria-hidden="true"
    />
  )
}

function DiamondWithPreview({ color }: { color: string }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number>(0)
  const ref = useRef<HTMLDivElement>(null)
  const isTransparent = color === "transparent"

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
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function hide() {
    closeTimer.current = window.setTimeout(() => setOpen(false), 80)
  }

  return (
    <div
      ref={ref}
      className="relative cursor-pointer select-none"
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerUp={e => {
        if (e.pointerType === "touch") setOpen(v => !v)
      }}
    >
      <Diamond color={color} />
      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-xl shadow-xl px-5 pt-5 pb-4 flex flex-col items-center gap-3"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <span
            aria-hidden="true"
            className={clsx("inline-block w-10 h-10 rounded-[4px] rotate-45 shadow-md", isTransparent && "diamond-transparent")}
            style={isTransparent ? { border: "2px solid #a0a0a0" } : { backgroundColor: color, border: `2px solid ${diamondBorder(color)}` }}
          />
          {!isTransparent && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-500 dark:text-primary-300 whitespace-nowrap">
              {hexToColorName(color)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamRow({ team, revealName = false }: { team: ColorsTeam; revealName?: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-6 px-3 py-3">
        <div className="flex items-center gap-5 shrink-0">
          {team.colors.map((color, i) => (
            <DiamondWithPreview
              key={`${color}-${i}`}
              color={color}
            />
          ))}
        </div>
        {revealName && (
          <div className="text-xs min-w-32 text-left">
            <div className="text-primary-500 dark:text-primary-200 uppercase tracking-wider font-bold">
              {team.league}
            </div>
            <div className="text-primary-900 dark:text-primary-50 font-semibold">{team.name}</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface GuessSlotsProps {
  guesses: string[]
  answer: ColorsState
  maxGuesses: number
  hideAnswer?: boolean
}

function StateBadge({ code, dim }: { code: string; dim?: boolean }) {
  const shape = code === "??" ? undefined : STATE_PATHS[code]
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex items-center justify-center w-8 h-8 shrink-0",
        dim ? "text-primary-300 dark:text-primary-700" : "text-current",
      )}
    >
      {shape ? (
        <svg
          viewBox={shape.viewBox}
          className="w-7 h-7"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
        >
          <path d={shape.d} />
        </svg>
      ) : (
        <span className="text-[0.7rem] font-black tracking-wider border border-current rounded px-1">
          {code === "??" ? "??" : code}
        </span>
      )}
    </span>
  )
}

function getStateCodeByName(name?: string): string | undefined {
  if (!name) return undefined
  return getStateByName(name)?.id
}

function CompassArrow({ fromCode, toCode }: { fromCode: string; toCode: string }) {
  const bearing = bearingDeg(fromCode, toCode)
  if (bearing === undefined) {
    return (
      <span
        className="w-7 h-7 shrink-0"
        aria-hidden="true"
      />
    )
  }
  // FA location-arrow points to the upper-right (~315° in compass terms).
  // Rotate so it points to the bearing.
  const rotation = bearing - 45
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 shrink-0 text-current"
      aria-hidden="true"
    >
      <FontAwesomeIcon
        icon={faLocationArrow}
        className="text-[1.1rem]"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </span>
  )
}

function GuessSlots({ guesses, answer, maxGuesses, hideAnswer = false }: GuessSlotsProps) {
  const answerCode = answer.id
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
        const isCorrect = guess?.toLowerCase() === answer.name.toLowerCase()
        const code = getStateCodeByName(guess)
        return (
          <div
            key={i}
            ref={el => {
              slotRefs.current[i] = el
            }}
            className={clsx(
              "w-full max-w-xs px-3 py-2 rounded-lg border-2 flex items-center gap-3 uppercase font-bold tracking-wider text-sm transition-colors",
              guess
                ? isCorrect
                  ? "bg-success-500/20 border-success-500/60 text-success-500 dark:text-success-400"
                  : "bg-error-500/20 border-error-500/60 text-error-500 dark:text-error-400"
                : "bg-transparent border-primary-300 dark:border-primary-700 text-primary-300 dark:text-primary-600",
              hideAnswer && isCorrect && "blur select-none opacity-40 transition-[filter,opacity] duration-200",
            )}
          >
            <StateBadge
              code={code ?? "??"}
              dim={!guess}
            />
            <span className="flex-1 text-center">{guess ?? "—"}</span>
            {guess && !isCorrect && code ? (
              <CompassArrow
                fromCode={code}
                toCode={answerCode}
              />
            ) : (
              <span
                className="w-7 h-7 shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface StateInputProps {
  onGuess: (stateName: string) => void
  disabled: boolean
  usedGuesses: Set<string>
}

function StateInput({ onGuess, disabled, usedGuesses }: StateInputProps) {
  const [query, setQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const fuse = useMemo(
    () =>
      new Fuse(ALL_STATES, {
        keys: ["name", "id"],
        threshold: 0.35,
        distance: 50,
      }),
    [],
  )

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    if (!trimmed) return []
    const q = trimmed.toLowerCase()
    const seen = new Set<string>()
    const result: USState[] = []

    for (const s of ALL_STATES) {
      if (usedGuesses.has(s.name.toLowerCase())) continue
      if (s.name.toLowerCase().startsWith(q) || s.id.toLowerCase() === q) {
        result.push(s)
        seen.add(s.id)
      }
    }

    if (result.length < 8) {
      for (const r of fuse.search(trimmed, { limit: 12 })) {
        if (seen.has(r.item.id)) continue
        if (usedGuesses.has(r.item.name.toLowerCase())) continue
        result.push(r.item)
        seen.add(r.item.id)
        if (result.length >= 8) break
      }
    }

    return result.slice(0, 8)
  }, [trimmed, usedGuesses, fuse])

  function handleSelect(state: USState) {
    onGuess(state.name)
    setQuery("")
    setShowDropdown(false)
    setHighlightIndex(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
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
          name="state-search"
          value={query}
          onChange={e => {
            setQuery(e.currentTarget.value)
            setShowDropdown(true)
            setHighlightIndex(0)
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
          onBlur={() => setShowDropdown(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type a state name..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-primary-300 bg-secondary-50 text-primary-900 outline-none dark:bg-secondary-900 dark:text-primary-50 dark:border-primary-700"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="search"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-10 dark:bg-secondary-900 dark:border-primary-700">
            {filtered.map((state, i) => {
              const shape = STATE_PATHS[state.id]
              return (
                <button
                  key={state.id}
                  className={clsx(
                    "flex justify-between items-center w-full px-3 py-2 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50",
                    i === highlightIndex
                      ? "bg-primary-100 dark:bg-primary-800"
                      : "hover:bg-primary-50 dark:hover:bg-primary-900",
                  )}
                  onPointerDown={e => {
                    e.preventDefault()
                    handleSelect(state)
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <span className="flex items-center gap-2">
                    {shape && (
                      <svg
                        viewBox={shape.viewBox}
                        className="w-6 h-6 shrink-0 text-primary-700 dark:text-primary-200"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth={1}
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={shape.d} />
                      </svg>
                    )}
                    <span className="font-semibold text-sm">{state.name}</span>
                  </span>
                  {i === highlightIndex && (
                    <span className="text-sm text-primary-500 dark:text-primary-200 opacity-60 ml-2 font-normal border border-primary-500 dark:border-primary-200 rounded px-1">
                      ↵
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResultsPanelProps {
  puzzle: ColorsPuzzle
  guesses: string[]
  won: boolean
  maxGuesses: number
  mode: ColorsGameMode
  stats: ColorsStats | null
  onClose: () => void
  onPlayAgain: () => void
}

function buildShareText(
  puzzle: ColorsPuzzle,
  guesses: string[],
  won: boolean,
  maxGuesses: number,
  url: string,
): string {
  const score = won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const title = puzzle.variant === "collegiate" ? "Collegiate Statehue" : "Statehue"
  return `${title} (${dateStr}) — ${score}\n\n${url}`
}

function ResultsPanel({
  puzzle,
  guesses,
  won,
  maxGuesses,
  mode,
  stats,
  onClose,
  onPlayAgain,
}: ResultsPanelProps) {
  const { share, copied } = useClipboardShare()
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1
  const resultsScrollRef = useRef<HTMLDivElement>(null)

  async function handleShare() {
    const path = puzzle.variant === "collegiate" ? "/statehue/collegiate" : "/statehue/daily"
    const rawUrl = `${window.location.origin}${path}`
    const url = await shortenUrl(rawUrl)
    share({ title: "Statehue", text: buildShareText(puzzle, guesses, won, maxGuesses, url) })
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

export default function ColorsGame({
  mode,
  variant = "pro",
  onModeChange,
  onBackToToday,
  archiveDateKey,
}: Props) {
  const [dateKey] = useState<string>(() => archiveDateKey ?? getTodayKey())
  const [activeMode, setActiveMode] = useState<ColorsGameMode>(mode)
  const [puzzle, setPuzzle] = useState<ColorsPuzzle>(() => {
    if (mode === "daily") {
      return archiveDateKey
        ? getColorsPuzzleByDateKey(archiveDateKey, variant)
        : getDailyColorsPuzzle(undefined, variant)
    }
    return getArcadeColorsPuzzle(undefined, variant)
  })
  const [guesses, setGuesses] = useState<string[]>(() =>
    mode === "daily" ? loadDailyGuesses(dateKey, variant) : [],
  )

  const [hideAnswer, setHideAnswer] = useState(false)

  const won = guesses.some(g => g.toLowerCase() === puzzle.state.name.toLowerCase())
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const wrongCount = guesses.filter(g => g.toLowerCase() !== puzzle.state.name.toLowerCase()).length
  // Hint cadence: start with 1 team's colors, +1 per wrong guess, up to 3.
  const visibleTeamCount = gameOver
    ? puzzle.teams.length
    : Math.min(1 + wrongCount, puzzle.teams.length)

  const gameScrollRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<ColorsStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateColorsStats(variant) : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      // Mark today as played only when this puzzle's date IS today, regardless of
      // how the player got here (via the daily entry point or the archive's
      // "Play this day" on today). Mirrors the archive-flag logic in
      // saveColorsResult so the daily-played marker stays consistent.
      if (puzzle.dateKey === getTodayKey()) markColorsDailyPlayed(variant)
      saveColorsResult(puzzle.dateKey, won, guesses.length, variant, guesses)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses, variant])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateColorsStats(variant))
    }
  }, [gameOver, activeMode, stats, variant])

  const confettiColors = useMemo(() => puzzle.teams.flatMap(t => t.colors), [puzzle.teams])
  useWinConfetti({
    won,
    colors: confettiColors,
    dedupKey: `${puzzle.dateKey}:${puzzle.state.id}:${guesses.length}`,
    duration: 2500,
  })

  const usedGuessesLower = useMemo(() => new Set(guesses.map(g => g.toLowerCase())), [guesses])

  function handleGuess(stateName: string) {
    if (gameOver) return
    if (usedGuessesLower.has(stateName.toLowerCase())) return
    const next = [...guesses, stateName]
    setGuesses(next)
    if (activeMode === "daily") saveDailyGuesses(dateKey, next, variant)
  }

  function handlePlayAgain() {
    const fresh = getArcadeColorsPuzzle(puzzle.state.id, variant)
    setPuzzle(fresh)
    setGuesses([])
    setActiveMode("arcade")
    onModeChange?.("arcade")
  }

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={puzzle.state.name}
      onPlayAgain={handlePlayAgain}
      onBackToToday={onBackToToday}
      isArcade={activeMode === "arcade"}
      renderResults={({ onClose, onPlayAgain }) => (
        <ResultsPanel
          puzzle={puzzle}
          guesses={guesses}
          won={won}
          maxGuesses={MAX_GUESSES}
          mode={activeMode}
          stats={stats}
          onClose={onClose}
          onPlayAgain={onPlayAgain}
        />
      )}
    >
      {gameOver &&
        (() => {
          const answerShape = STATE_PATHS[puzzle.state.id]
          return (
            <ResultBanner
              won={won}
              guessCount={guesses.length}
              hideAnswer={hideAnswer}
              onToggleHide={() => setHideAnswer(h => !h)}
              answer={
                <span className="inline-flex items-center justify-center gap-3">
                  {answerShape && (
                    <svg
                      viewBox={answerShape.viewBox}
                      className="w-8 h-8"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={answerShape.d} />
                    </svg>
                  )}
                  {puzzle.state.name}
                </span>
              }
            />
          )
        })()}
      <div
        ref={gameScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
      >
        <div className="max-w-md mx-auto px-3 py-4 flex flex-col gap-3">
          <div className="rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 py-2">
            {puzzle.teams.slice(0, visibleTeamCount).map((team, i) => (
              <TeamRow
                key={`${team.name}-${i}`}
                team={team}
                revealName={gameOver && !hideAnswer}
              />
            ))}
          </div>

          <div className="mt-2">
            <GuessSlots
              guesses={guesses}
              answer={puzzle.state}
              maxGuesses={MAX_GUESSES}
              hideAnswer={hideAnswer}
            />
          </div>
        </div>
      </div>
      <ScrollHint scrollRef={gameScrollRef} />

      <StateInput
        onGuess={handleGuess}
        disabled={gameOver}
        usedGuesses={usedGuessesLower}
      />
    </DailyGameShell>
  )
}
