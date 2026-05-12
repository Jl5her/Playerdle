import { faLocationArrow, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import confetti from "canvas-confetti"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Popup, ScrollHint } from "@/components"
import { ALL_STATES, getStateByName, type USState } from "@/data/colors/all-states"
import { bearingDeg } from "@/data/colors/state-geo"
import { type ColorsState, type ColorsTeam } from "@/data/colors/states"
import { STATE_PATHS } from "@/data/colors/state-paths"
import {
  calculateColorsStats,
  type ColorsPuzzle,
  type ColorsStats,
  getArcadeColorsPuzzle,
  getDailyColorsPuzzle,
  markColorsDailyPlayed,
  saveColorsResult,
} from "@/utils/colors-daily"
import { getTodayKeyInEasternTime } from "@/utils/daily"

const MAX_GUESSES = 5
const STORAGE_KEY = "playerdle-colors-state:v1"

export type ColorsGameMode = "daily" | "arcade"

interface Props {
  mode: ColorsGameMode
}

interface SavedState {
  dateKey: string
  guesses: string[]
}

function loadDailyGuesses(dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedState
    if (parsed.dateKey !== dateKey) return []
    return parsed.guesses ?? []
  } catch {
    return []
  }
}

function saveDailyGuesses(dateKey: string, guesses: string[]) {
  const state: SavedState = { dateKey, guesses }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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

function Diamond({ color }: { color: string }) {
  const border = shadeHex(color, -0.25)
  return (
    <span
      className="inline-block w-7 h-7 rounded-[3px] rotate-45 shadow-sm"
      style={{ backgroundColor: color, border: `1px solid ${border}` }}
      aria-hidden="true"
    />
  )
}

function TeamRow({ team }: { team: ColorsTeam }) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-5 px-3 py-3">
        {team.colors.map((color, i) => (
          <Diamond
            key={`${color}-${i}`}
            color={color}
          />
        ))}
      </div>
    </div>
  )
}

interface GuessSlotsProps {
  guesses: string[]
  answer: ColorsState
  maxGuesses: number
}

function StateBadge({ code, dim }: { code: string; dim?: boolean }) {
  const shape = code === "??" ? undefined : STATE_PATHS[code]
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center w-8 h-8 shrink-0 ${
        dim ? "text-primary-300 dark:text-primary-700" : "text-current"
      }`}
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

function CompassArrow({
  fromCode,
  toCode,
}: {
  fromCode: string
  toCode: string
}) {
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

function GuessSlots({ guesses, answer, maxGuesses }: GuessSlotsProps) {
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
            className={`w-full max-w-xs px-3 py-2 rounded-lg border-2 flex items-center gap-3 uppercase font-bold tracking-wider text-sm transition-colors ${
              guess
                ? isCorrect
                  ? "bg-success-500/20 border-success-500/60 text-success-500 dark:text-success-400"
                  : "bg-error-500/20 border-error-500/60 text-error-500 dark:text-error-400"
                : "bg-transparent border-primary-300 dark:border-primary-700 text-primary-300 dark:text-primary-600"
            }`}
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
    <div className="shrink-0 mx-3 mb-3 bg-primary-50 dark:bg-primary-900">
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
                  className={`flex justify-between items-center w-full px-3 py-2 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50 ${
                    i === highlightIndex
                      ? "bg-primary-100 dark:bg-primary-800"
                      : "hover:bg-primary-50 dark:hover:bg-primary-900"
                  }`}
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
  lost: boolean
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
): string {
  const score = won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date())
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/palette` : "/palette"
  return `Statehue #${puzzle.index} (${dateStr}) — ${score}\n${url}`
}

function ResultsPanel({
  puzzle,
  guesses,
  won,
  lost,
  maxGuesses,
  mode,
  stats,
  onClose,
  onPlayAgain,
}: ResultsPanelProps) {
  const [copied, setCopied] = useState(false)
  const shape = STATE_PATHS[puzzle.state.id]
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1
  const resultsScrollRef = useRef<HTMLDivElement>(null)

  function handleShare() {
    const text = buildShareText(puzzle, guesses, won, maxGuesses)
    const share: ShareData = { title: "Statehue", text }
    const canUseShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(share))
    if (canUseShare) {
      navigator.share(share).catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return
        copyText(text)
      })
      return
    }
    copyText(text)
  }

  function showCopiedPill() {
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  function legacyCopyText(text: string) {
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

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(showCopiedPill)
        .catch(() => legacyCopyText(text))
      return
    }
    legacyCopyText(text)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pb-4">
      <Popup
        visible={copied}
        message="Copied to clipboard!"
        durationMs={3000}
      />
      <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-between pt-3">
        <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
          Results
        </h2>
        <button
          type="button"
          className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
          aria-label="Close results"
          onClick={onClose}
        >
          <FontAwesomeIcon
            icon={faXmark}
            className="text-2xl"
          />
        </button>
      </div>

      <div
        className={`shrink-0 px-4 py-3 text-center border-y-2 mt-1 ${
          won
            ? "bg-success-500/15 dark:bg-success-500/20 border-success-500/60 dark:border-success-400/60"
            : "bg-error-500/15 dark:bg-error-500/25 border-error-500/60 dark:border-error-400/60"
        }`}
      >
        <div
          className={`text-base font-black tracking-widest uppercase mb-1 ${
            won
              ? "text-success-500 dark:text-success-400"
              : "text-error-500 dark:text-error-400"
          }`}
        >
          {won ? "Correct" : "Game Over"}
        </div>
        <div className="text-xs text-primary-500 dark:text-primary-200 uppercase">
          The answer was
        </div>
        <div className="flex items-center justify-center gap-3">
          {shape && (
            <svg
              viewBox={shape.viewBox}
              className="w-8 h-8 text-primary-700 dark:text-primary-200"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1}
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={shape.d} />
            </svg>
          )}
          <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">
            {puzzle.state.name}
          </div>
        </div>
        <div
          className={`text-sm mt-2 font-medium uppercase ${
            won
              ? "text-success-500 dark:text-success-400"
              : "text-error-500 dark:text-error-400"
          }`}
        >
          {won
            ? `You got it in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}`
            : "Better luck tomorrow!"}
        </div>
      </div>

      <div
        ref={resultsScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 mt-4 w-full max-w-2xl mx-auto"
      >

        <div className="mt-5 flex flex-col gap-3 items-center">
          {puzzle.teams.map((team, i) => (
            <div
              key={`${team.name}-${i}`}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-5 shrink-0 px-1 py-1">
                {team.colors.map((color, j) => (
                  <Diamond
                    key={`${color}-${j}`}
                    color={color}
                  />
                ))}
              </div>
              <div className="text-xs min-w-[10rem] text-left">
                <div className="text-primary-500 dark:text-primary-200 uppercase tracking-wider font-bold">
                  {team.league}
                </div>
                <div className="text-primary-900 dark:text-primary-50 font-semibold">
                  {team.name}
                </div>
              </div>
            </div>
          ))}
        </div>

        {mode === "daily" && stats && (
          <div className="mt-6">
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
                      className={`min-h-4 py-1 rounded-sm text-xs font-semibold px-2 flex items-center justify-end ${
                        has
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
        )}

        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          {mode === "daily" && (
            <button
              type="button"
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
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line
                  x1="12"
                  y1="2"
                  x2="12"
                  y2="15"
                />
              </svg>
              {copied ? "Copied!" : "Share"}
            </button>
          )}
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-bold text-primary-50 dark:text-primary-900 bg-success-500 dark:bg-success-400 border-none rounded cursor-pointer uppercase hover:opacity-90 transition-opacity"
            onClick={() => {
              onPlayAgain()
              onClose()
            }}
          >
            Play Again
          </button>
        </div>

        {!won && !lost && null}
      </div>
      <ScrollHint scrollRef={resultsScrollRef} />
    </div>
  )
}

export default function ColorsGame({ mode }: Props) {
  const [dateKey] = useState<string>(getTodayKeyInEasternTime)
  const [activeMode, setActiveMode] = useState<ColorsGameMode>(mode)
  const [puzzle, setPuzzle] = useState<ColorsPuzzle>(() =>
    mode === "daily" ? getDailyColorsPuzzle() : getArcadeColorsPuzzle(),
  )
  const [guesses, setGuesses] = useState<string[]>(() =>
    mode === "daily" ? loadDailyGuesses(dateKey) : [],
  )

  const won = guesses.some(g => g.toLowerCase() === puzzle.state.name.toLowerCase())
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const wrongCount = guesses.filter(
    g => g.toLowerCase() !== puzzle.state.name.toLowerCase(),
  ).length
  // Hint cadence: start with 1 team's colors, +1 per wrong guess, up to 3.
  const visibleTeamCount = gameOver
    ? puzzle.teams.length
    : Math.min(1 + wrongCount, puzzle.teams.length)

  const wasGameOverAtMountRef = useRef(gameOver)
  const [showResults, setShowResults] = useState(wasGameOverAtMountRef.current)
  const gameScrollRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<ColorsStats | null>(() =>
    wasGameOverAtMountRef.current && activeMode === "daily" ? calculateColorsStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      markColorsDailyPlayed()
      saveColorsResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setShowResults(false)
      return
    }
    if (wasGameOverAtMountRef.current) return
    setStats(activeMode === "daily" ? calculateColorsStats() : null)
    if (won) {
      const t = setTimeout(() => setShowResults(true), 1400)
      return () => clearTimeout(t)
    }
  }, [gameOver, won, activeMode])

  const confettiKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!won) return
    const key = `${puzzle.dateKey}:${puzzle.state.id}:${guesses.length}`
    if (confettiKeyRef.current === key) return
    confettiKeyRef.current = key

    const colors = puzzle.teams.flatMap(t => t.colors)
    const duration = 2500
    const end = Date.now() + duration
    function frame() {
      confetti({
        particleCount: 18,
        angle: 60,
        spread: 85,
        startVelocity: 65,
        gravity: 1.1,
        origin: { x: 0, y: 0 },
        colors,
        zIndex: 2000,
      })
      confetti({
        particleCount: 18,
        angle: 120,
        spread: 85,
        startVelocity: 65,
        gravity: 1.1,
        origin: { x: 1, y: 0 },
        colors,
        zIndex: 2000,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.3 },
      colors,
      zIndex: 2000,
    })
    frame()
  }, [won, puzzle, guesses.length])

  const usedGuessesLower = useMemo(
    () => new Set(guesses.map(g => g.toLowerCase())),
    [guesses],
  )

  function handleGuess(stateName: string) {
    if (gameOver) return
    if (usedGuessesLower.has(stateName.toLowerCase())) return
    const next = [...guesses, stateName]
    setGuesses(next)
    if (activeMode === "daily") saveDailyGuesses(dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getArcadeColorsPuzzle(puzzle.state.id)
    setPuzzle(fresh)
    setGuesses([])
    setActiveMode("arcade")
    confettiKeyRef.current = null
    wasGameOverAtMountRef.current = false
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 overflow-hidden relative">
      <Popup
        visible={gameOver && !showResults}
        message={puzzle.state.name}
      />

      <div
        className={`crossfade-panel h-full min-h-0 overflow-hidden flex flex-col ${showResults ? "crossfade-inactive" : "crossfade-active"}`}
      >
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
                />
              ))}
            </div>

            <div className="mt-2">
              <GuessSlots
                guesses={guesses}
                answer={puzzle.state}
                maxGuesses={MAX_GUESSES}
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

        {gameOver && (
          <div className="shrink-0 px-3 py-3 bg-primary-50 dark:bg-primary-900 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={() => setShowResults(true)}
              variant="secondary"
            >
              See Results
            </Button>
          </div>
        )}
      </div>

      <div
        className={`slide-up-panel absolute inset-0 flex flex-col bg-primary-50 dark:bg-primary-900 ${showResults ? "slide-up-active" : "slide-up-inactive"}`}
      >
        <ResultsPanel
          puzzle={puzzle}
          guesses={guesses}
          won={won}
          lost={lost}
          maxGuesses={MAX_GUESSES}
          mode={activeMode}
          stats={stats}
          onClose={() => setShowResults(false)}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    </div>
  )
}
