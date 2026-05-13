import confetti from "canvas-confetti"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  DailyGameShell,
  PlayAgainButton,
  Popup,
  ResultBanner,
  ScrollHint,
  ShareButton,
} from "@/components"
import nflPlayers from "@/data/nfl/players.json"
import { getCollegePalette } from "@/data/journey/college-colors"
import { ELIGIBLE_JOURNEY_PLAYERS, isEligiblePosition } from "@/data/journey/players"
import { getNflTeamPalette } from "@/data/journey/team-colors"
import { useClipboardShare } from "@/hooks/use-clipboard-share"
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
  targetPosition: string
  maxGuesses: number
}

function GuessSlots({ guesses, answerName, targetPosition, maxGuesses }: GuessSlotsProps) {
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
            className={`relative w-full max-w-xs px-3 py-2 rounded-lg border-2 uppercase font-bold tracking-wider text-sm transition-colors ${tone}`}
          >
            <span className="block text-center">{guess ?? "—"}</span>
            {position && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-70">
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
    typeof window !== "undefined"
      ? `${window.location.origin}/journeyman/daily`
      : "/journeyman/daily"

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

  return `Journeyman #${puzzle.index} (${dateStr}) — ${score}\n${emojiRow}\n${url}`
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
  const { share, copied } = useClipboardShare()
  const ladderScrollRef = useRef<HTMLDivElement>(null)

  function handleShare() {
    share({ title: "Journey", text: buildShareText(puzzle, guesses, won, maxGuesses) })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pb-4">
      <Popup
        visible={copied}
        message="Copied to clipboard!"
        durationMs={3000}
      />

      <ResultBanner
        won={won}
        guessCount={guesses.length}
        answer={puzzle.player.name}
      />

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

  const gameScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      markJourneyDailyPlayed()
      saveJourneyResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

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
    confettiKeyRef.current = null
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
          onClose={onClose}
          onPlayAgain={onPlayAgain}
        />
      )}
    >
      <div
        ref={gameScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
      >
        <div className="max-w-sm mx-auto px-3 py-4 flex flex-col gap-3">
          <div className="relative rounded-2xl border-2 border-primary-300 dark:border-primary-700 p-8 mt-6 mx-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <PositionDiamond position={positionRevealed ? puzzle.player.position : "?"} />
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
              targetPosition={puzzle.player.position}
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
    </DailyGameShell>
  )
}
