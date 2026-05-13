import { getCollegePalette } from "@playerdle/data/journeyman/college-colors"
import { ELIGIBLE_JOURNEY_PLAYERS, isEligiblePosition } from "@playerdle/data/journeyman/players"
import { getNflTeamPalette } from "@playerdle/data/journeyman/team-colors"
import nflPlayers from "@playerdle/data/playerdle/nfl/players.json"
import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  calculateJourneyStats,
  getArcadeJourneyPuzzle,
  getDailyJourneyPuzzle,
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

const MAX_GUESSES = 5
const STORAGE_KEY = "playerdle-journey-state:v1"

export type JourneyGameMode = "daily" | "arcade"

interface Props {
  mode: JourneyGameMode
  onModeChange?: (mode: JourneyGameMode) => void
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
      className={clsx("flip-diamond", revealed ? "revealed" : "")}
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
  const [swatchOpen, setSwatchOpen] = useState(false)
  const closeTimer = useRef<number>(0)
  const swatchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!swatchOpen) return
    function onOutside(e: PointerEvent) {
      if (!swatchRef.current?.contains(e.target as Node)) setSwatchOpen(false)
    }
    document.addEventListener("pointerdown", onOutside)
    return () => document.removeEventListener("pointerdown", onOutside)
  }, [swatchOpen])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  function showSwatch() {
    if (!revealed) return
    window.clearTimeout(closeTimer.current)
    setSwatchOpen(true)
  }
  function hideSwatch() {
    closeTimer.current = window.setTimeout(() => setSwatchOpen(false), 80)
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-3">
      {showName && (
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary-500 dark:text-primary-200">
          {name}
        </span>
      )}
      <div
        ref={swatchRef}
        className={clsx(
          "relative flex items-center justify-center gap-5",
          revealed && "cursor-pointer select-none",
        )}
        onMouseEnter={showSwatch}
        onMouseLeave={hideSwatch}
        onPointerUp={e => {
          if (e.pointerType === "touch" && revealed) setSwatchOpen(v => !v)
        }}
      >
        {palette.map((c, i) => (
          <FlipDiamond
            key={`${c}-${i}`}
            color={c}
            revealed={revealed}
            delayMs={i * 180}
          />
        ))}
        {swatchOpen && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-2xl shadow-xl px-5 py-5 flex items-center gap-5 whitespace-nowrap"
            onMouseEnter={showSwatch}
            onMouseLeave={hideSwatch}
          >
            {palette.map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="inline-block w-10 h-10 rounded-[4px] rotate-45 shadow-md shrink-0"
                style={{ backgroundColor: c, border: `2px solid ${shadeHex(c, -0.25)}` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface GuessSlotsProps {
  guesses: string[]
  answerName: string
  targetPosition: string
  maxGuesses: number
  hideAnswer?: boolean
}

function GuessSlots({ guesses, answerName, targetPosition, maxGuesses, hideAnswer = false }: GuessSlotsProps) {
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
          <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-10 dark:bg-secondary-900 dark:border-primary-700">
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
  puzzle: JourneyPuzzle
  guesses: string[]
  won: boolean
  maxGuesses: number
  mode: JourneyGameMode
  stats: JourneyStats | null
  onClose: () => void
  onPlayAgain: () => void
}

function buildShareText(
  puzzle: JourneyPuzzle,
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

  return `Journeyman (${dateStr}) — ${score}\n${emojiRow}\n\n${url}`
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
  const resultsScrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  async function handleShare() {
    const rawUrl = `${window.location.origin}/journeyman/daily`
    const url = await shortenUrl(rawUrl)
    share({ title: "Journeyman", text: buildShareText(puzzle, guesses, won, maxGuesses, url) })
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

export default function JourneyGame({ mode, onModeChange }: Props) {
  const [dateKey] = useState<string>(getTodayKey)
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
  const [hideAnswer, setHideAnswer] = useState(false)

  const REVEAL_STEPS = MAX_GUESSES - 2 // 3 reveal steps before the final guess
  const visibleTeamsCount = gameOver
    ? puzzle.player.teams.length
    : Math.min(
        1 +
          Math.ceil(
            ((puzzle.player.teams.length - 1) * Math.min(wrongCount, REVEAL_STEPS)) / REVEAL_STEPS,
          ),
        puzzle.player.teams.length,
      )

  const gameScrollRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<JourneyStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateJourneyStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      markJourneyDailyPlayed()
      saveJourneyResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateJourneyStats())
    }
  }, [gameOver, activeMode, stats])

  const confettiColors = useMemo(
    () => puzzle.player.teams.flatMap(t => getPaletteOrFallback(t)),
    [puzzle.player.teams],
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
  }, [guesses, puzzle.player.position, gameOver])

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
    onModeChange?.("arcade")
  }

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={puzzle.player.name}
      onPlayAgain={handlePlayAgain}
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
              <LadderRow
                name={puzzle.player.college}
                palette={
                  getCollegePalette(puzzle.player.college) ?? ["#888888", "#bbbbbb", "#dddddd"]
                }
                revealed
                showName={gameOver && !hideAnswer}
              />
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
      />
    </DailyGameShell>
  )
}
