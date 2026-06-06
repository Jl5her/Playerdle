import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  COMPARISON_POSITIONS,
  calculateRatedStats,
  compareGroupedToAnswer,
  type GroupedComparison,
  getGroupedOvr,
  getNflRatedArcadePuzzle,
  getNflRatedDailyPuzzle,
  getNflRatedPuzzleByDateKey,
  getNflRatedTeams,
  loadNflRatedDailyGuesses,
  markNflRatedPlayed,
  NFL_RATED_MAX_GUESSES,
  type NflRatedGuessRecord,
  type NflRatedPuzzle,
  type NflRatedStats,
  OL_POSITIONS,
  POSITIONS,
  type PositionResult,
  type RatedStarter,
  type RatedTeam,
  saveNflRatedDailyGuesses,
  saveNflRatedResult,
} from "@/games/rated/utils/nfl-rated-daily"
import {
  DailyGameShell,
  type GuessCell,
  type GuessCellStatus,
  GuessGrid,
  type GuessGridRow,
  numberCell,
  PlayAgainButton,
  Popup,
  ResultBanner,
  ScrollHint,
  ShareButton,
} from "@/shared/components"
import { useClipboardShare } from "@/shared/hooks/use-clipboard-share"
import { useWinConfetti } from "@/shared/hooks/use-win-confetti"
import { getTodayKey } from "@/shared/utils/time"

export type NflRatedGameMode = "daily" | "arcade"

interface Props {
  mode: NflRatedGameMode
  onModeChange?: (mode: NflRatedGameMode) => void
  onGameOver?: (won: boolean, guessCount: number) => void
  archiveDateKey?: string
}

// ---- OVR badge ----

// PFF grade color scale applied to player OVR ratings — a teal → green → lime →
// yellow → orange gradient (matching PFF's live grade cells).
function ovrColor(ovr: number): string {
  if (ovr >= 90) return "#1b7d8c" // Elite — dark teal
  if (ovr >= 85) return "#2c9b87" // teal
  if (ovr >= 80) return "#41a85a" // green
  if (ovr >= 75) return "#62b54e" // green
  if (ovr >= 70) return "#8ac440" // lime
  if (ovr >= 65) return "#b9d033" // yellow-lime
  if (ovr >= 60) return "#ebd52e" // yellow
  if (ovr >= 55) return "#f6b52a" // gold
  if (ovr >= 50) return "#f48f22" // orange
  if (ovr >= 45) return "#f06e20" // dark orange
  return "#ec4a23" // red-orange
}

function OvrBadge({
  starter,
  size = "md",
  matchResult,
  showTooltip = false,
  revealName: _revealName = false,
}: {
  starter: RatedStarter
  size?: "sm" | "md" | "lg"
  matchResult?: PositionResult
  showTooltip?: boolean
  revealName?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastPointerTypeRef = useRef<string>("mouse")
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!tooltipPos) return
    const dismiss = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTooltipPos(null)
    }
    document.addEventListener("pointerdown", dismiss, true)
    return () => document.removeEventListener("pointerdown", dismiss, true)
  }, [tooltipPos])

  function computePos() {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? { x: rect.left + rect.width / 2, y: rect.top } : null
  }

  const sizeDim = {
    sm: { diameter: 36, fontSize: 11, strokeWidth: 3.5 },
    md: { diameter: 48, fontSize: 14, strokeWidth: 4.5 },
    lg: { diameter: 56, fontSize: 17, strokeWidth: 5 },
  }
  const { diameter, fontSize, strokeWidth } = sizeDim[size]
  const r = (diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clampedOvr = Math.min(Math.max(starter.ovr, 50), 99)
  const arcFraction = 0.5 + ((clampedOvr - 50) / 49) * 0.5
  const arcLength = arcFraction * circumference

  const isNonCorrect = matchResult !== undefined && matchResult !== "correct"
  const arcColor =
    matchResult === "correct" ? "#22c55e" : isNonCorrect ? "#6b7280" : ovrColor(starter.ovr)

  return (
    <>
      <div
        ref={ref}
        className="relative flex items-center justify-center select-none cursor-pointer transition-opacity"
        style={{
          width: diameter,
          height: diameter,
          borderRadius: "50%",
          backgroundColor: "#0f172a",
          boxShadow: matchResult === "correct" ? "0 0 0 2px rgba(34,197,94,0.3)" : undefined,
          opacity: isNonCorrect ? 0.45 : undefined,
        }}
        onPointerDown={e => {
          lastPointerTypeRef.current = e.pointerType
        }}
        onPointerEnter={e => {
          if (e.pointerType === "mouse" && showTooltip) setTooltipPos(computePos())
        }}
        onPointerLeave={e => {
          if (e.pointerType === "mouse") setTooltipPos(null)
        }}
        onClick={() => {
          if (showTooltip && lastPointerTypeRef.current !== "mouse") {
            setTooltipPos(prev => (prev ? null : computePos()))
          }
        }}
      >
        <svg
          width={diameter}
          height={diameter}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          />
        </svg>
        <span
          className="font-black text-white leading-none relative"
          style={{ fontSize, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
        >
          {starter.ovr}
        </span>
      </div>
      {tooltipPos &&
        showTooltip &&
        createPortal(
          <div
            className="pointer-events-none whitespace-nowrap rounded-md bg-primary-900 dark:bg-primary-100 text-primary-50 dark:text-primary-900 text-xs font-semibold px-2 py-1 shadow-lg"
            style={{
              position: "fixed",
              left: tooltipPos.x,
              top: tooltipPos.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
            }}
          >
            {starter.name}
          </div>,
          document.body,
        )}
    </>
  )
}

// ---- Football formation diagram ----

type FormationPosition = (typeof POSITIONS)[number] | (typeof OL_POSITIONS)[number]

function FootballFormation({ team }: { team: RatedTeam }) {
  const positions: Array<{ pos: FormationPosition; x: string; y: string }> = [
    { pos: "WR1", x: "5%", y: "42%" },
    { pos: "WR3", x: "17%", y: "42%" },
    { pos: "LT", x: "28%", y: "42%" },
    { pos: "LG", x: "39%", y: "42%" },
    { pos: "C", x: "50%", y: "42%" },
    { pos: "RG", x: "61%", y: "42%" },
    { pos: "RT", x: "72%", y: "42%" },
    { pos: "TE", x: "83%", y: "46%" },
    { pos: "WR2", x: "95%", y: "42%" },
    { pos: "QB", x: "50%", y: "64%" },
    { pos: "RB", x: "63%", y: "81%" },
  ]
  const starterMap = team.starters as Record<FormationPosition, RatedStarter | undefined>

  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: "66.7%" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 300 200"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Field stripes */}
          <rect
            width="300"
            height="200"
            fill="#14472d"
          />
          <rect
            x="0"
            y="0"
            width="300"
            height="40"
            fill="#1a5c3a"
          />
          <rect
            x="0"
            y="80"
            width="300"
            height="40"
            fill="#1a5c3a"
          />
          <rect
            x="0"
            y="160"
            width="300"
            height="40"
            fill="#1a5c3a"
          />
          {/* Yard lines */}
          <line
            x1="0"
            y1="40"
            x2="300"
            y2="40"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <line
            x1="0"
            y1="80"
            x2="300"
            y2="80"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <line
            x1="0"
            y1="120"
            x2="300"
            y2="120"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <line
            x1="0"
            y1="160"
            x2="300"
            y2="160"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          {/* Hash marks — left (x=96) */}
          <line
            x1="96"
            y1="36"
            x2="96"
            y2="44"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="96"
            y1="76"
            x2="96"
            y2="84"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="96"
            y1="116"
            x2="96"
            y2="124"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="96"
            y1="156"
            x2="96"
            y2="164"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          {/* Hash marks — right (x=204) */}
          <line
            x1="204"
            y1="36"
            x2="204"
            y2="44"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="204"
            y1="76"
            x2="204"
            y2="84"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="204"
            y1="116"
            x2="204"
            y2="124"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="204"
            y1="156"
            x2="204"
            y2="164"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          {/* Line of scrimmage */}
          <line
            x1="0"
            y1="95"
            x2="300"
            y2="95"
            stroke="rgba(255,255,180,0.8)"
            strokeWidth="2.5"
          />
          {/* WR1 go route */}
          <line
            x1="15"
            y1="80"
            x2="15"
            y2="12"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <polygon
            points="15,8 11,16 19,16"
            fill="rgba(255,255,255,0.35)"
          />
          {/* WR2 go route */}
          <line
            x1="285"
            y1="80"
            x2="285"
            y2="12"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <polygon
            points="285,8 281,16 289,16"
            fill="rgba(255,255,255,0.35)"
          />
          {/* RB swing */}
          <path
            d="M 189 162 Q 228 150 246 136"
            fill="none"
            stroke="rgba(255,255,255,0.26)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <polygon
            points="246,136 240,144 236,136"
            fill="rgba(255,255,255,0.26)"
          />
        </svg>
      </div>

      {positions.map(({ pos, x, y }) => {
        const starter = starterMap[pos]
        if (!starter) return null
        return (
          <div
            key={pos}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: y }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <OvrBadge
                starter={starter}
                size="sm"
                showTooltip
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest text-white leading-none"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
              >
                {pos}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Guess row cells ----

function statusFromResult(result: PositionResult): GuessCellStatus {
  if (result === "correct") return "correct"
  if (result === "close-up" || result === "close-down") return "close"
  return "incorrect"
}

function resultArrow(result: PositionResult): string | undefined {
  if (result === "correct") return undefined
  return result.endsWith("-up") ? "↑" : "↓"
}

/** Build the grouped OVR cells (QB | RB | TE | WR | OL) for one guessed team. */
function buildRatedRowCells(team: RatedTeam, comparison: GroupedComparison): GuessCell[] {
  return COMPARISON_POSITIONS.map(pos => {
    const result = comparison[pos]
    return numberCell(getGroupedOvr(team, pos), statusFromResult(result), {
      arrow: resultArrow(result),
    })
  })
}

// ---- Team autocomplete ----

interface TeamOption {
  id: string
  name: string
  abbr: string
}

function TeamInput({
  onGuess,
  disabled,
  usedIds,
  teams,
}: {
  onGuess: (team: TeamOption) => void
  disabled: boolean
  usedIds: Set<string>
  teams: TeamOption[]
}) {
  const [query, setQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const fuse = useMemo(
    () => new Fuse(teams, { keys: ["name", "abbr"], threshold: 0.35, distance: 50 }),
    [teams],
  )

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    if (!trimmed) return []
    const q = trimmed.toLowerCase()
    const seen = new Set<string>()
    const result: TeamOption[] = []
    for (const t of teams) {
      if (usedIds.has(t.id)) continue
      if (t.name.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q)) {
        result.push(t)
        seen.add(t.id)
        if (result.length >= 10) break
      }
    }
    if (result.length < 10) {
      for (const r of fuse.search(trimmed, { limit: 10 })) {
        if (seen.has(r.item.id) || usedIds.has(r.item.id)) continue
        result.push(r.item)
        seen.add(r.item.id)
        if (result.length >= 10) break
      }
    }
    return result.slice(0, 10)
  }, [trimmed, usedIds, fuse, teams])

  function handleSelect(option: TeamOption) {
    onGuess(option)
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
    <div className="guess-input-shell shrink-0 mx-3 bg-primary-50 dark:bg-primary-900">
      <div className="relative max-w-xs mx-auto">
        <input
          ref={inputRef}
          type="text"
          name="team-search"
          value={query}
          onChange={e => {
            setQuery(e.currentTarget.value)
            setShowDropdown(true)
            setHighlightIndex(0)
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
          onBlur={() => setShowDropdown(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type a team name..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-primary-300 bg-secondary-50 text-primary-900 outline-none dark:bg-secondary-900 dark:text-primary-50 dark:border-primary-700"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="search"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 max-h-64 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-30 dark:bg-secondary-900 dark:border-primary-700">
            {filtered.map((option, i) => (
              <button
                key={option.id}
                className={clsx(
                  "flex justify-between items-center w-full px-3 py-2.5 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50",
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
                <span className="text-xs text-primary-500 dark:text-primary-200 ml-2 font-mono">
                  {option.abbr}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Share text ----

function buildShareText(
  guesses: NflRatedGuessRecord[],
  comparisons: GroupedComparison[],
  won: boolean,
): string {
  const score = won ? `${guesses.length}/${NFL_RATED_MAX_GUESSES}` : `X/${NFL_RATED_MAX_GUESSES}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const emojiGrid = comparisons
    .map(c =>
      COMPARISON_POSITIONS.map(p => {
        const r = c[p]
        if (r === "correct") return "🟩"
        if (r === "close-up" || r === "close-down") return "🟨"
        return "⬜"
      }).join(""),
    )
    .join("\n")

  return `Rated NFL (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}/rated`
}

// ---- Results panel ----

function ResultsPanel({
  puzzle,
  guesses,
  comparisons,
  won,
  mode,
  stats,
  onClose,
  onPlayAgain,
}: {
  puzzle: NflRatedPuzzle
  guesses: NflRatedGuessRecord[]
  comparisons: GroupedComparison[]
  won: boolean
  mode: NflRatedGameMode
  stats: NflRatedStats | null
  onClose: () => void
  onPlayAgain: () => void
}) {
  const { share, copied } = useClipboardShare()
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function handleShare() {
    share({
      title: "Rated",
      text: buildShareText(guesses, comparisons, won),
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
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 mt-4 w-full max-w-2xl mx-auto"
      >
        <div className="mb-4 rounded-xl border border-primary-200 dark:border-primary-700 overflow-hidden">
          <div className="bg-primary-100 dark:bg-primary-800 py-2 text-center text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
            {puzzle.team.name} — Starting Offense
          </div>
          <div className="flex gap-3 justify-center py-3 px-2 flex-wrap">
            {POSITIONS.map(pos => {
              const starter = puzzle.team.starters[pos]
              return (
                <div
                  key={pos}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">
                    {pos}
                  </span>
                  <OvrBadge
                    starter={starter}
                    size="lg"
                  />
                  <span className="text-[9px] font-semibold text-primary-800 dark:text-primary-100 max-w-[3.5rem] text-center leading-tight line-clamp-2">
                    {starter.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {mode === "daily" && stats && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
              Statistics
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { value: stats.played, label: "Played" },
                { value: stats.winPercentage, label: "Win %" },
                { value: stats.currentStreak, label: "Current\nStreak" },
                { value: stats.maxStreak, label: "Max\nStreak" },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="text-center"
                >
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">
                    {value}
                  </div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light leading-tight whitespace-pre-line">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
              Guess Distribution
            </h3>
            {Array.from({ length: NFL_RATED_MAX_GUESSES }, (_, i) => i + 1).map(num => {
              const count = stats.guessDistribution[num] || 0
              const scaledWidth = maxBar > 0 ? (count / maxBar) * 100 : 0
              const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`
              const isHighlighted = won && num === guesses.length
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
                        count > 0
                          ? isHighlighted
                            ? "bg-primary-700 text-primary-50"
                            : "bg-primary-400 dark:bg-primary-500 text-primary-50 dark:text-primary-900"
                          : "bg-primary-100 dark:bg-primary-800 text-primary-500",
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
      <ScrollHint scrollRef={scrollRef} />
    </div>
  )
}

// ---- Main game ----

export default function NflRatedGame({ mode, onModeChange, onGameOver, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<NflRatedGameMode>(mode)
  const allTeams = useMemo(() => getNflRatedTeams(), [])
  const teamOptions: TeamOption[] = useMemo(
    () => allTeams.map(t => ({ id: t.id, name: t.name, abbr: t.abbr })),
    [allTeams],
  )
  const teamsById = useMemo(() => new Map(allTeams.map(t => [t.id, t])), [allTeams])

  const [puzzle, setPuzzle] = useState<NflRatedPuzzle>(() =>
    mode === "daily"
      ? archiveDateKey
        ? getNflRatedPuzzleByDateKey(archiveDateKey)
        : getNflRatedDailyPuzzle()
      : getNflRatedArcadePuzzle(),
  )

  const [guesses, setGuesses] = useState<NflRatedGuessRecord[]>(() =>
    mode === "daily" ? loadNflRatedDailyGuesses(puzzle.dateKey) : [],
  )

  const usedIds = useMemo(() => new Set(guesses.map(g => g.teamId)), [guesses])
  const won = guesses.some(g => g.teamId === puzzle.team.id)
  const lost = !won && guesses.length >= NFL_RATED_MAX_GUESSES
  const gameOver = won || lost

  const comparisons: GroupedComparison[] = useMemo(
    () =>
      guesses.map(g => {
        const guessedTeam = teamsById.get(g.teamId)
        if (!guessedTeam) {
          return Object.fromEntries(
            COMPARISON_POSITIONS.map(p => [p, "incorrect-down"]),
          ) as unknown as GroupedComparison
        }
        if (guessedTeam.id === puzzle.team.id) {
          return Object.fromEntries(
            COMPARISON_POSITIONS.map(p => [p, "correct"]),
          ) as unknown as GroupedComparison
        }
        return compareGroupedToAnswer(guessedTeam, puzzle.team)
      }),
    [guesses, puzzle.team, teamsById],
  )

  const [stats, setStats] = useState<NflRatedStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateRatedStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      if (puzzle.dateKey === getTodayKey()) markNflRatedPlayed()
      saveNflRatedResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateRatedStats())
    }
  }, [gameOver, activeMode, stats])

  const prevGameOverRef = useRef(false)
  useEffect(() => {
    if (gameOver && !prevGameOverRef.current) {
      prevGameOverRef.current = true
      onGameOver?.(won, guesses.length)
    }
  }, [gameOver, won, guesses.length, onGameOver])

  useWinConfetti({
    won,
    colors: ["#f59e0b", "#10b981", "#3b82f6"],
    dedupKey: `${puzzle.dateKey}:${puzzle.team.id}:${guesses.length}`,
  })

  function handleGuess(team: TeamOption) {
    if (gameOver || usedIds.has(team.id)) return
    const next: NflRatedGuessRecord[] = [...guesses, { teamId: team.id, teamName: team.name }]
    setGuesses(next)
    if (activeMode === "daily") saveNflRatedDailyGuesses(puzzle.dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getNflRatedArcadePuzzle(puzzle.team.id)
    setPuzzle(fresh)
    setGuesses([])
    setStats(null)
    setActiveMode("arcade")
    onModeChange?.("arcade")
  }

  const gameScrollRef = useRef<HTMLDivElement>(null)
  const [latestIndex, setLatestIndex] = useState<number>(-1)
  const [hideAnswer, setHideAnswer] = useState(false)

  const prevGuessCount = useRef(guesses.length)
  useEffect(() => {
    if (guesses.length > prevGuessCount.current) setLatestIndex(guesses.length - 1)
    prevGuessCount.current = guesses.length
  }, [guesses.length])

  const rows: GuessGridRow[] = guesses.map((g, i) => {
    const guessedTeam = teamsById.get(g.teamId)
    const cells: GuessCell[] = guessedTeam
      ? buildRatedRowCells(guessedTeam, comparisons[i])
      : COMPARISON_POSITIONS.map(() => numberCell(0, "incorrect"))
    return {
      id: `${g.teamId}-${i}`,
      label: g.teamName,
      cells,
      muted: hideAnswer && g.teamId === puzzle.team.id,
    }
  })

  return (
    <DailyGameShell
      gameOver={gameOver}
      popupMessage={puzzle.team.name}
      onPlayAgain={handlePlayAgain}
      renderResults={({ onClose, onPlayAgain }) => (
        <ResultsPanel
          puzzle={puzzle}
          guesses={guesses}
          comparisons={comparisons}
          won={won}
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
          answer={puzzle.team.name}
          hideAnswer={hideAnswer}
          onToggleHide={() => setHideAnswer(h => !h)}
        />
      )}
      <div
        ref={gameScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none pb-4"
      >
        {/* Formation capped to the guess grid's natural max width (26rem) */}
        <div className="mx-auto w-full max-w-[26rem] px-2 pt-3">
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 overflow-hidden">
            <FootballFormation team={puzzle.team} />
          </div>
        </div>

        {/* Guess grid — shared with Playerdle (same cells, colors, layout & width) */}
        <div className="mt-3">
          <GuessGrid
            headers={[...COMPARISON_POSITIONS]}
            rows={rows}
            maxRows={NFL_RATED_MAX_GUESSES}
            columnCount={COMPARISON_POSITIONS.length}
            latestIndex={latestIndex}
          />
        </div>
      </div>
      <ScrollHint scrollRef={gameScrollRef} />
      <TeamInput
        onGuess={handleGuess}
        disabled={gameOver}
        usedIds={usedIds}
        teams={teamOptions}
      />
    </DailyGameShell>
  )
}
