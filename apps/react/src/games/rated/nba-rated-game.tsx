import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  calculateRatedStats,
  compareTeamToAnswer,
  getNbaRatedArcadePuzzle,
  getNbaRatedDailyPuzzle,
  getNbaRatedPuzzleByDateKey,
  getNbaRatedTeams,
  loadNbaRatedDailyGuesses,
  markNbaRatedPlayed,
  saveNbaRatedDailyGuesses,
  saveNbaRatedResult,
  NBA_RATED_MAX_GUESSES,
  POSITIONS,
  type NbaRatedGuessRecord,
  type NbaRatedPuzzle,
  type NbaRatedStats,
  type RatedComparison,
  type RatedStarter,
  type RatedTeam,
  type PositionResult,
} from "@/games/rated/utils/nba-rated-daily"
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
import { getTodayKey } from "@/shared/utils/time"

export type NbaRatedGameMode = "daily" | "arcade"

interface Props {
  mode: NbaRatedGameMode
  onModeChange?: (mode: NbaRatedGameMode) => void
  onGameOver?: (won: boolean, guessCount: number) => void
  archiveDateKey?: string
}

// ---- OVR badge ----

function ovrColor(ovr: number): string {
  if (ovr >= 95) return "#16a34a"
  if (ovr >= 85) return "#84cc16"
  if (ovr >= 75) return "#eab308"
  if (ovr >= 65) return "#f97316"
  return "#ef4444"
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
    sm: { width: 36, height: 44, fontSize: 11 },
    md: { width: 48, height: 56, fontSize: 14 },
    lg: { width: 56, height: 68, fontSize: 17 },
  }
  const { width, height, fontSize } = sizeDim[size]
  const fillPct = Math.max(2, Math.min(100, ((starter.ovr - 50) / 49) * 100))
  const color = ovrColor(starter.ovr)

  const borderStyle =
    matchResult === "correct"
      ? { border: "2px solid #22c55e", boxShadow: "0 0 0 2px rgba(34,197,94,0.3)" }
      : matchResult === "incorrect"
        ? { border: "2px solid #6b7280", opacity: 0.55 }
        : { border: "2px solid rgba(255,255,255,0.35)" }

  return (
    <>
      <div
        ref={ref}
        className="relative overflow-hidden rounded-md select-none cursor-pointer transition-opacity"
        style={{ width, height, backgroundColor: "#111827", ...borderStyle }}
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
        {/* Gauge fill — rises from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500"
          style={{ height: `${fillPct}%`, backgroundColor: color, opacity: 0.85 }}
        />
        {/* OVR number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black text-white leading-none"
            style={{ fontSize, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
          >
            {starter.ovr}
          </span>
        </div>
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

// ---- Half-court diagram ----

function HalfCourt({ team }: { team: RatedTeam }) {
  // Positions calibrated to reference image (basket at top, viewBox 300×250)
  const positions: Array<{ pos: "PG" | "SG" | "SF" | "PF" | "C"; x: string; y: string }> = [
    { pos: "PG", x: "51%", y: "78%" },
    { pos: "SG", x: "13%", y: "55%" },
    { pos: "SF", x: "80%", y: "43%" },
    { pos: "PF", x: "25%", y: "22%" },
    { pos: "C", x: "57%", y: "16%" },
  ]

  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: "83.3%" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 300 250"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 5-colour maple hardwood — 90 px wide, full-height repeat */}
            <pattern
              id="hardwood-nba"
              patternUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="90"
              height="250"
            >
              {/* Plank 1 — light golden maple */}
              <rect
                x="0"
                y="0"
                width="18"
                height="250"
                fill="#efd082"
              />
              <line
                x1="3.0"
                y1="0"
                x2="3.8"
                y2="250"
                stroke="rgba(110,55,0,0.07)"
                strokeWidth="0.7"
              />
              <line
                x1="8.0"
                y1="0"
                x2="8.7"
                y2="250"
                stroke="rgba(110,55,0,0.04)"
                strokeWidth="0.5"
              />
              <line
                x1="14.0"
                y1="0"
                x2="14.6"
                y2="250"
                stroke="rgba(110,55,0,0.05)"
                strokeWidth="0.5"
              />
              {/* Plank 2 — deep amber */}
              <rect
                x="18"
                y="0"
                width="18"
                height="250"
                fill="#c08638"
              />
              <line
                x1="21.0"
                y1="0"
                x2="21.8"
                y2="250"
                stroke="rgba(80,40,0,0.08)"
                strokeWidth="0.7"
              />
              <line
                x1="26.0"
                y1="0"
                x2="26.6"
                y2="250"
                stroke="rgba(80,40,0,0.05)"
                strokeWidth="0.5"
              />
              <line
                x1="32.0"
                y1="0"
                x2="32.6"
                y2="250"
                stroke="rgba(80,40,0,0.04)"
                strokeWidth="0.5"
              />
              {/* Plank 3 — warm honey */}
              <rect
                x="36"
                y="0"
                width="18"
                height="250"
                fill="#e4c060"
              />
              <line
                x1="39.0"
                y1="0"
                x2="39.8"
                y2="250"
                stroke="rgba(100,50,0,0.06)"
                strokeWidth="0.7"
              />
              <line
                x1="44.0"
                y1="0"
                x2="44.6"
                y2="250"
                stroke="rgba(100,50,0,0.04)"
                strokeWidth="0.5"
              />
              <line
                x1="50.0"
                y1="0"
                x2="50.6"
                y2="250"
                stroke="rgba(100,50,0,0.05)"
                strokeWidth="0.5"
              />
              {/* Plank 4 — medium amber */}
              <rect
                x="54"
                y="0"
                width="18"
                height="250"
                fill="#cfa045"
              />
              <line
                x1="57.0"
                y1="0"
                x2="57.8"
                y2="250"
                stroke="rgba(80,40,0,0.08)"
                strokeWidth="0.7"
              />
              <line
                x1="62.0"
                y1="0"
                x2="62.6"
                y2="250"
                stroke="rgba(80,40,0,0.05)"
                strokeWidth="0.5"
              />
              <line
                x1="68.0"
                y1="0"
                x2="68.6"
                y2="250"
                stroke="rgba(80,40,0,0.04)"
                strokeWidth="0.5"
              />
              {/* Plank 5 — medium golden */}
              <rect
                x="72"
                y="0"
                width="18"
                height="250"
                fill="#e0b858"
              />
              <line
                x1="75.0"
                y1="0"
                x2="75.8"
                y2="250"
                stroke="rgba(100,50,0,0.06)"
                strokeWidth="0.7"
              />
              <line
                x1="80.0"
                y1="0"
                x2="80.6"
                y2="250"
                stroke="rgba(100,50,0,0.04)"
                strokeWidth="0.5"
              />
              <line
                x1="86.0"
                y1="0"
                x2="86.6"
                y2="250"
                stroke="rgba(100,50,0,0.05)"
                strokeWidth="0.5"
              />
              {/* Board separators */}
              <line
                x1="17.5"
                y1="0"
                x2="17.5"
                y2="250"
                stroke="rgba(55,22,0,0.22)"
                strokeWidth="0.6"
              />
              <line
                x1="35.5"
                y1="0"
                x2="35.5"
                y2="250"
                stroke="rgba(55,22,0,0.22)"
                strokeWidth="0.6"
              />
              <line
                x1="53.5"
                y1="0"
                x2="53.5"
                y2="250"
                stroke="rgba(55,22,0,0.22)"
                strokeWidth="0.6"
              />
              <line
                x1="71.5"
                y1="0"
                x2="71.5"
                y2="250"
                stroke="rgba(55,22,0,0.22)"
                strokeWidth="0.6"
              />
              <line
                x1="89.5"
                y1="0"
                x2="89.5"
                y2="250"
                stroke="rgba(55,22,0,0.22)"
                strokeWidth="0.6"
              />
            </pattern>
            {/* Soft court spotlight */}
            <radialGradient
              id="court-light-nba"
              cx="50%"
              cy="42%"
              r="68%"
            >
              <stop
                offset="0%"
                stopColor="rgba(255,240,180,0.10)"
              />
              <stop
                offset="55%"
                stopColor="rgba(0,0,0,0.00)"
              />
              <stop
                offset="100%"
                stopColor="rgba(0,0,0,0.12)"
              />
            </radialGradient>
          </defs>

          {/* Floor */}
          <rect
            width="300"
            height="250"
            fill="url(#hardwood-nba)"
          />
          <rect
            width="300"
            height="250"
            fill="url(#court-light-nba)"
          />

          {/* Court boundary */}
          <rect
            x="3"
            y="4"
            width="294"
            height="242"
            rx="3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />

          {/* Three-point line: corner straights + elliptical arc */}
          <line
            x1="22"
            y1="4"
            x2="22"
            y2="60"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />
          <line
            x1="278"
            y1="4"
            x2="278"
            y2="60"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />
          <path
            d="M 22 60 A 128 82 0 0 0 278 60"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />

          {/* Key / paint */}
          <rect
            x="102"
            y="4"
            width="96"
            height="71"
            fill="rgba(255,255,255,0.06)"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />

          {/* Free throw line */}
          <line
            x1="102"
            y1="75"
            x2="198"
            y2="75"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />
          {/* FT circle — solid half toward basket, dashed half away */}
          <path
            d="M 102 75 A 48 48 0 0 0 198 75"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />
          <path
            d="M 102 75 A 48 48 0 0 1 198 75"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.38"
            strokeDasharray="5 4"
          />

          {/* Lane tick marks */}
          <line
            x1="94"
            y1="31"
            x2="102"
            y2="31"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
          <line
            x1="198"
            y1="31"
            x2="206"
            y2="31"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
          <line
            x1="94"
            y1="53"
            x2="102"
            y2="53"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
          <line
            x1="198"
            y1="53"
            x2="206"
            y2="53"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />

          {/* Backboard & hoop */}
          <line
            x1="127"
            y1="4"
            x2="173"
            y2="4"
            stroke="white"
            strokeWidth="2.5"
            strokeOpacity="0.92"
          />
          <ellipse
            cx="150"
            cy="9"
            rx="10"
            ry="4"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeOpacity="0.95"
          />
          {/* Restricted arc */}
          <path
            d="M 127 4 A 23 23 0 0 0 173 4"
            fill="none"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.48"
          />

          {/* Half-court line + center circle arc */}
          <line
            x1="3"
            y1="246"
            x2="297"
            y2="246"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.60"
          />
          <path
            d="M 105 246 A 45 45 0 0 0 195 246"
            fill="none"
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.60"
          />
        </svg>
      </div>

      {positions.map(({ pos, x, y }) => (
        <div
          key={pos}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <OvrBadge
              starter={team.starters[pos]}
              size="lg"
              showTooltip
            />
            <span className="text-[11px] font-black uppercase tracking-widest text-white drop-shadow leading-none">
              {pos}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Guess row ----

function PositionCell({
  starter,
  matchResult,
  delayMs,
  animate,
}: {
  starter: RatedStarter
  matchResult: PositionResult
  delayMs: number
  animate: boolean
}) {
  const [revealed, setRevealed] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setRevealed(true), delayMs)
    return () => clearTimeout(t)
  }, [animate, delayMs])

  return revealed ? (
    <OvrBadge
      starter={starter}
      size="md"
      matchResult={matchResult}
    />
  ) : (
    <div className="rounded-md bg-primary-200 dark:bg-primary-700" style={{ width: 48, height: 56 }} />
  )
}

function GuessRow({
  teamName,
  guessedTeam,
  comparison,
  animate,
}: {
  teamName: string
  guessedTeam: RatedTeam
  comparison: RatedComparison
  animate?: boolean
}) {
  return (
    <div>
      <div className="px-2 py-0.5 text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none truncate">
        {teamName}
      </div>
      <div className="flex gap-1.5 justify-center">
        {POSITIONS.map((pos, i) => (
          <PositionCell
            key={pos}
            starter={guessedTeam.starters[pos]}
            matchResult={comparison[pos]}
            delayMs={i * 80 + 150}
            animate={animate ?? false}
          />
        ))}
      </div>
    </div>
  )
}

// ---- Empty guess row placeholder ----

function EmptyRow() {
  return (
    <div className="flex gap-1.5 justify-center">
      {POSITIONS.map(pos => (
        <div
          key={pos}
          className="rounded-md border border-primary-200 dark:border-primary-700"
          style={{ width: 48, height: 56 }}
        />
      ))}
    </div>
  )
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
    <div className="shrink-0 mx-3 mb-3 pb-[max(0rem,env(safe-area-inset-bottom))] bg-primary-50 dark:bg-primary-900">
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
  guesses: NbaRatedGuessRecord[],
  comparisons: RatedComparison[],
  won: boolean,
): string {
  const score = won ? `${guesses.length}/${NBA_RATED_MAX_GUESSES}` : `X/${NBA_RATED_MAX_GUESSES}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const emojiGrid = comparisons
    .map(c => POSITIONS.map(p => (c[p] === "correct" ? "🟩" : "⬜")).join(""))
    .join("\n")

  return `Rated NBA (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}/nba/rated`
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
  puzzle: NbaRatedPuzzle
  guesses: NbaRatedGuessRecord[]
  comparisons: RatedComparison[]
  won: boolean
  mode: NbaRatedGameMode
  stats: NbaRatedStats | null
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
        {/* Answer reveal */}
        <div className="mb-4 rounded-xl border border-primary-200 dark:border-primary-700 overflow-hidden">
          <div className="bg-primary-100 dark:bg-primary-800 py-2 text-center text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
            {puzzle.team.name} — Starting Five
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
                    showTooltip
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
            {Array.from({ length: NBA_RATED_MAX_GUESSES }, (_, i) => i + 1).map(num => {
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
                            ? "bg-primary-700 dark:bg-primary-700 text-primary-50"
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

export default function NbaRatedGame({ mode, onModeChange, onGameOver, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<NbaRatedGameMode>(mode)
  const allTeams = useMemo(() => getNbaRatedTeams(), [])
  const teamOptions: TeamOption[] = useMemo(
    () => allTeams.map(t => ({ id: t.id, name: t.name, abbr: t.abbr })),
    [allTeams],
  )
  const teamsById = useMemo(() => new Map(allTeams.map(t => [t.id, t])), [allTeams])

  const [puzzle, setPuzzle] = useState<NbaRatedPuzzle>(() =>
    mode === "daily"
      ? archiveDateKey
        ? getNbaRatedPuzzleByDateKey(archiveDateKey)
        : getNbaRatedDailyPuzzle()
      : getNbaRatedArcadePuzzle(),
  )

  const [guesses, setGuesses] = useState<NbaRatedGuessRecord[]>(() =>
    mode === "daily" ? loadNbaRatedDailyGuesses(puzzle.dateKey) : [],
  )

  const usedIds = useMemo(() => new Set(guesses.map(g => g.teamId)), [guesses])
  const won = guesses.some(g => g.teamId === puzzle.team.id)
  const lost = !won && guesses.length >= NBA_RATED_MAX_GUESSES
  const gameOver = won || lost

  const comparisons: RatedComparison[] = useMemo(
    () =>
      guesses.map(g => {
        const guessedTeam = teamsById.get(g.teamId)
        if (!guessedTeam) {
          return Object.fromEntries(
            POSITIONS.map(p => [p, "incorrect"]),
          ) as unknown as RatedComparison
        }
        if (guessedTeam.id === puzzle.team.id) {
          return Object.fromEntries(
            POSITIONS.map(p => [p, "correct"]),
          ) as unknown as RatedComparison
        }
        return compareTeamToAnswer(guessedTeam, puzzle.team)
      }),
    [guesses, puzzle.team, teamsById],
  )

  const [stats, setStats] = useState<NbaRatedStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateRatedStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      if (puzzle.dateKey === getTodayKey()) markNbaRatedPlayed()
      saveNbaRatedResult(puzzle.dateKey, won, guesses.length)
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
    const next: NbaRatedGuessRecord[] = [...guesses, { teamId: team.id, teamName: team.name }]
    setGuesses(next)
    if (activeMode === "daily") saveNbaRatedDailyGuesses(puzzle.dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getNbaRatedArcadePuzzle(puzzle.team.id)
    setPuzzle(fresh)
    setGuesses([])
    setStats(null)
    setActiveMode("arcade")
    onModeChange?.("arcade")
  }

  const gameScrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const [latestIndex, setLatestIndex] = useState<number>(-1)

  useEffect(() => {
    if (latestIndex < 0) return
    rowRefs.current[latestIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex])

  const prevGuessCount = useRef(guesses.length)
  useEffect(() => {
    if (guesses.length > prevGuessCount.current) setLatestIndex(guesses.length - 1)
    prevGuessCount.current = guesses.length
  }, [guesses.length])

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
        />
      )}
      <div
        ref={gameScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none"
      >
        <div className="max-w-sm mx-auto px-3 pb-4">
          {/* Half-court diagram */}
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 mt-3 mx-1 overflow-hidden">
            <HalfCourt team={puzzle.team} />
          </div>

          {/* Guess grid */}
          <div className="mt-4">
            <div className="flex gap-1.5 justify-center mb-2 sticky top-0 z-10 bg-primary-50 dark:bg-primary-900 py-1">
              {POSITIONS.map(pos => (
                <div
                  key={pos}
                  className="w-12 text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
                >
                  {pos}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: NBA_RATED_MAX_GUESSES }).map((_, i) =>
                i < guesses.length ? (
                  <div
                    key={i}
                    ref={el => {
                      rowRefs.current[i] = el
                    }}
                  >
                    {(() => {
                      const guessedTeam = teamsById.get(guesses[i].teamId)
                      if (!guessedTeam) return null
                      return (
                        <GuessRow
                          teamName={guesses[i].teamName}
                          guessedTeam={guessedTeam}
                          comparison={comparisons[i]}
                          animate={i === latestIndex}
                        />
                      )
                    })()}
                  </div>
                ) : (
                  <div
                    key={`empty-${i}`}
                    ref={el => {
                      rowRefs.current[i] = el
                    }}
                  >
                    <EmptyRow />
                  </div>
                ),
              )}
            </div>
          </div>
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
