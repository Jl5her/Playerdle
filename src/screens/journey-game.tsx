import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import confetti from "canvas-confetti"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Popup, ScrollHint } from "@/components"
import nflPlayers from "@/data/nfl/players.json"
import { getCollegePalette } from "@/data/journey/college-colors"
import { ELIGIBLE_JOURNEY_PLAYERS, isEligiblePosition } from "@/data/journey/players"
import { getNflTeamPalette } from "@/data/journey/team-colors"
import {
  getArcadeJourneyPuzzle,
  getDailyJourneyPuzzle,
  type JourneyPuzzle,
  markJourneyDailyPlayed,
  saveJourneyResult,
} from "@/utils/journey-daily"
import { getTodayKeyInEasternTime } from "@/utils/daily"

const MAX_GUESSES = 5
const STORAGE_KEY = "playerdle-journey-state:v1"

export type JourneyGameMode = "daily" | "arcade"

interface Props {
  mode: JourneyGameMode
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

function getPaletteOrFallback(teamName: string): [string, string, string] {
  return getNflTeamPalette(teamName) ?? ["#888888", "#bbbbbb", "#dddddd"]
}

interface PlayerOption {
  name: string
  position: string
}

const autocompletePool: PlayerOption[] = (() => {
  const byName = new Map<string, PlayerOption>()
  for (const p of nflPlayers as Array<{ name: string; position: string }>) {
    if (!isEligiblePosition(p.position)) continue
    byName.set(p.name.toLowerCase(), { name: p.name, position: p.position })
  }
  for (const j of ELIGIBLE_JOURNEY_PLAYERS) {
    if (!byName.has(j.name.toLowerCase())) {
      byName.set(j.name.toLowerCase(), { name: j.name, position: j.position })
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
})()

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
  const border = shadeHex(color, -0.25)
  // Both faces share the same per-diamond stagger delay.
  const frontStyle: React.CSSProperties = { transitionDelay: `${delayMs}ms` }
  const backStyle: React.CSSProperties = {
    backgroundColor: color,
    borderColor: border,
    transitionDelay: `${delayMs + 300}ms`,
  }
  return (
    <span
      className={`flip-diamond ${revealed ? "revealed" : ""}`}
      aria-hidden="true"
    >
      <span
        className="flip-diamond-face flip-diamond-front bg-primary-200 dark:bg-primary-700 border-primary-300 dark:border-primary-700"
        style={frontStyle}
      />
      <span
        className="flip-diamond-face flip-diamond-back"
        style={backStyle}
      />
    </span>
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
          <FlipDiamond
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
  maxGuesses: number
}

function GuessSlots({ guesses, answerName, maxGuesses }: GuessSlotsProps) {
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
        return (
          <div
            key={i}
            ref={el => {
              slotRefs.current[i] = el
            }}
            className={`w-full max-w-xs px-3 py-2 rounded-lg border-2 text-center uppercase font-bold tracking-wider text-sm transition-colors ${guess
                ? isCorrect
                  ? "bg-success-500/20 border-success-500/60 text-success-500 dark:text-success-400"
                  : "bg-error-500/20 border-error-500/60 text-error-500 dark:text-error-400"
                : "bg-transparent border-primary-300 dark:border-primary-700 text-primary-300 dark:text-primary-600"
              }`}
          >
            {guess ?? "—"}
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
}

function PlayerInput({ onGuess, disabled, usedGuesses }: PlayerInputProps) {
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
    [],
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
  }, [trimmed, usedGuesses, fuse])

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
    <div className="shrink-0 mx-3 mb-3 bg-primary-50 dark:bg-primary-900">
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
          <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-10 dark:bg-secondary-900 dark:border-primary-700">
            {filtered.map((option, i) => (
              <button
                key={option.name}
                className={`flex justify-between items-center w-full px-3 py-2 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50 ${i === highlightIndex
                    ? "bg-primary-100 dark:bg-primary-800"
                    : "hover:bg-primary-50 dark:hover:bg-primary-900"
                  }`}
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
  puzzle: JourneyPuzzle
  guesses: string[]
  won: boolean
  maxGuesses: number
  mode: JourneyGameMode
  onClose: () => void
  onPlayAgain: () => void
}

function buildShareText(
  puzzle: JourneyPuzzle,
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
    typeof window !== "undefined" ? `${window.location.origin}/palette/journey` : "/palette/journey"
  return `Journey #${puzzle.index} (${dateStr}) — ${score}\n${url}`
}

function ResultsPanel({
  puzzle,
  guesses,
  won,
  maxGuesses,
  mode,
  onClose,
  onPlayAgain,
}: ResultsPanelProps) {
  const [copied, setCopied] = useState(false)
  const ladderScrollRef = useRef<HTMLDivElement>(null)

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

  function handleShare() {
    const text = buildShareText(puzzle, guesses, won, maxGuesses)
    const share: ShareData = { title: "Journey", text }
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
        <div className="text-xl font-bold text-primary-900 dark:text-primary-50 uppercase">
          {puzzle.player.name}
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
        ref={ladderScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 mt-4"
      >
        <div className="flex flex-col gap-2 max-w-sm mx-auto pb-4">
          {won ? (
            (() => {
              const usedTeams = Math.min(guesses.length, puzzle.player.teams.length)
              const collegePalette: [string, string, string] =
                getCollegePalette(puzzle.player.college) ?? ["#888888", "#bbbbbb", "#dddddd"]
              return (
                <>
                  <div className="w-fit mx-auto flex flex-col rounded-xl border-2 border-primary-300 dark:border-primary-700">
                    <LadderRow
                      name={puzzle.player.college}
                      palette={collegePalette}
                      revealed
                      showName
                    />
                    {puzzle.player.teams.slice(0, usedTeams).map((team, i) => (
                      <LadderRow
                        key={`${team}-${i}`}
                        name={team}
                        palette={getPaletteOrFallback(team)}
                        revealed
                        showName
                      />
                    ))}
                  </div>
                  {puzzle.player.teams.slice(usedTeams).map((team, i) => (
                    <LadderRow
                      key={`${team}-after-${i}`}
                      name={team}
                      palette={getPaletteOrFallback(team)}
                      revealed
                      showName
                    />
                  ))}
                </>
              )
            })()
          ) : (
            <>
              <LadderRow
                name={puzzle.player.college}
                palette={
                  getCollegePalette(puzzle.player.college) ?? ["#888888", "#bbbbbb", "#dddddd"]
                }
                revealed
                showName
              />
              {puzzle.player.teams.map((team, i) => (
                <LadderRow
                  key={`${team}-${i}`}
                  name={team}
                  palette={getPaletteOrFallback(team)}
                  revealed
                  showName
                />
              ))}
            </>
          )}
        </div>
      </div>
      <ScrollHint scrollRef={ladderScrollRef} />

      <div className="shrink-0 w-full max-w-2xl mx-auto px-4 flex gap-3 justify-center mt-4 pt-3 flex-wrap border-t border-primary-200 dark:border-primary-800">
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
    </div>
  )
}

export default function JourneyGame({ mode }: Props) {
  const [dateKey] = useState<string>(getTodayKeyInEasternTime)
  const [activeMode, setActiveMode] = useState<JourneyGameMode>(mode)
  const [puzzle, setPuzzle] = useState<JourneyPuzzle>(() =>
    mode === "daily" ? getDailyJourneyPuzzle() : getArcadeJourneyPuzzle(),
  )
  const [guesses, setGuesses] = useState<string[]>(() =>
    mode === "daily" ? loadDailyGuesses(dateKey) : [],
  )

  const answerName = puzzle.player.name
  const won = guesses.some(g => g.toLowerCase() === answerName.toLowerCase())
  const lost = !won && guesses.length >= MAX_GUESSES
  const gameOver = won || lost
  const wrongCount = guesses.filter(g => g.toLowerCase() !== answerName.toLowerCase()).length

  // Reveal cadence: college + first team start visible; remaining teams are
  // spread across the first 3 wrong guesses so the full ladder is exposed by
  // the time the player makes their 4th guess. Each step reveals 1–3 teams
  // depending on how many they've played for.
  const REVEAL_STEPS = MAX_GUESSES - 2 // 3 reveal steps before the final guess
  const visibleTeamsCount = gameOver
    ? puzzle.player.teams.length
    : Math.min(
      1 + Math.ceil(((puzzle.player.teams.length - 1) * Math.min(wrongCount, REVEAL_STEPS)) / REVEAL_STEPS),
      puzzle.player.teams.length,
    )

  const wasGameOverAtMountRef = useRef(gameOver)
  const [showResults, setShowResults] = useState(wasGameOverAtMountRef.current)
  const gameScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      markJourneyDailyPlayed()
      saveJourneyResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setShowResults(false)
      return
    }
    if (wasGameOverAtMountRef.current) return
    if (won) {
      const t = setTimeout(() => setShowResults(true), 1400)
      return () => clearTimeout(t)
    }
  }, [gameOver, won, activeMode])

  const confettiKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!won) return
    const key = `${puzzle.dateKey}:${puzzle.player.id}:${guesses.length}`
    if (confettiKeyRef.current === key) return
    confettiKeyRef.current = key

    const colors = puzzle.player.teams.flatMap(t => getPaletteOrFallback(t))
    const duration = 1500
    const end = Date.now() + duration
    function frame() {
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 0, y: 0 },
        colors,
        zIndex: 2000,
      })
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 75,
        startVelocity: 60,
        gravity: 1.2,
        origin: { x: 1, y: 0 },
        colors,
        zIndex: 2000,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [won, puzzle, guesses.length])

  const usedGuessesLower = useMemo(
    () => new Set(guesses.map(g => g.toLowerCase())),
    [guesses],
  )

  function handleGuess(name: string) {
    if (gameOver) return
    if (usedGuessesLower.has(name.toLowerCase())) return
    const next = [...guesses, name]
    setGuesses(next)
    if (activeMode === "daily") saveDailyGuesses(dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getArcadeJourneyPuzzle(puzzle.player.id)
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
        message={puzzle.player.name}
      />

      <div
        className={`crossfade-panel h-full min-h-0 overflow-hidden flex flex-col ${showResults ? "crossfade-inactive" : "crossfade-active"}`}
      >
        <div
          ref={gameScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
        >
          <div className="max-w-sm mx-auto px-3 py-4 flex flex-col gap-3">
            <div className="relative rounded-2xl border-2 border-primary-300 dark:border-primary-700 p-8 mt-6 mx-8">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <PositionDiamond position={puzzle.player.position} />
              </div>
              <div className="flex flex-col">
                <LadderRow
                  name={puzzle.player.college}
                  palette={
                    getCollegePalette(puzzle.player.college) ?? [
                      "#888888",
                      "#bbbbbb",
                      "#dddddd",
                    ]
                  }
                  revealed
                />
                {puzzle.player.teams.map((team, i) => (
                  <LadderRow
                    key={`${team}-${i}`}
                    name={team}
                    palette={getPaletteOrFallback(team)}
                    revealed={i < visibleTeamsCount}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2">
              <GuessSlots
                guesses={guesses}
                answerName={answerName}
                maxGuesses={MAX_GUESSES}
              />
            </div>
          </div>
        </div>
        <ScrollHint scrollRef={gameScrollRef} />

        <PlayerInput
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
          maxGuesses={MAX_GUESSES}
          mode={activeMode}
          onClose={() => setShowResults(false)}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    </div>
  )
}
