import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  calculateCapCrunchStats,
  compareTeamToAnswer,
  getCapCrunchArcadePuzzle,
  getCapCrunchDailyPuzzle,
  getCapCrunchPuzzleByDateKey,
  getCapCrunchTeams,
  loadCapCrunchDailyGuesses,
  markCapCrunchPlayed,
  CAPCRUNCH_MAX_GUESSES,
  saveCapCrunchDailyGuesses,
  saveCapCrunchResult,
  type ComparisonResult,
  type CapCrunchComparison,
  type CapCrunchGuessRecord,
  type CapCrunchLeague,
  type CapCrunchOffense,
  type CapCrunchPlayer,
  type CapCrunchPuzzle,
  type CapCrunchStats,
} from "@/games/capcrunch/utils/capcrunch-daily"
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

export type CapCrunchGameMode = "daily" | "arcade"

interface Props {
  league: CapCrunchLeague
  mode: CapCrunchGameMode
  onModeChange?: (mode: CapCrunchGameMode) => void
  onGameOver?: (won: boolean, guessCount: number) => void
  archiveDateKey?: string
}

function formatSalary(amount: number): string {
  const millions = amount / 1_000_000
  return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
}

// ---- Formation display ----

function PlayerSlot({
  position,
  player,
  revealed,
}: {
  position: string
  player: CapCrunchPlayer
  revealed: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastPointerTypeRef = useRef<string>("mouse")
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  function computePos() {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? { x: rect.left + rect.width / 2, y: rect.top } : null
  }

  // Dismiss when tapping/clicking anywhere outside this slot
  useEffect(() => {
    if (!tooltipPos) return
    const dismiss = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTooltipPos(null)
    }
    document.addEventListener("pointerdown", dismiss, true)
    return () => document.removeEventListener("pointerdown", dismiss, true)
  }, [tooltipPos])

  const tooltipLabel = player.number != null ? `${player.name} #${player.number}` : player.name

  return (
    <>
      <div
        ref={ref}
        className="flex flex-col items-center gap-0.5 min-w-[3.5rem] select-none"
        onPointerDown={e => { lastPointerTypeRef.current = e.pointerType }}
        onPointerEnter={e => { if (e.pointerType === "mouse") setTooltipPos(computePos()) }}
        onPointerLeave={e => { if (e.pointerType === "mouse") setTooltipPos(null) }}
        onClick={() => {
          if (lastPointerTypeRef.current !== "mouse") {
            setTooltipPos(prev => (prev ? null : computePos()))
          }
        }}
      >
        <div className="text-[9px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-400">
          {position}
        </div>
        <div className="w-14 rounded-lg border-2 border-primary-300 dark:border-primary-600 bg-primary-100 dark:bg-primary-800 flex flex-col items-center py-1.5 gap-0.5 cursor-pointer">
          <span className="text-[11px] font-bold text-primary-400 dark:text-primary-500 truncate w-full text-center px-1">
            {revealed ? player.name : "?"}
          </span>
          {revealed && player.number != null && (
            <span className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 tabular-nums leading-none">
              #{player.number}
            </span>
          )}
          <span className="text-[11px] font-black text-primary-800 dark:text-primary-100 tabular-nums">
            {formatSalary(player.salary)}
          </span>
        </div>
      </div>
      {tooltipPos &&
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
            {tooltipLabel}
          </div>,
          document.body,
        )}
    </>
  )
}

function Formation({ offense, revealed }: { offense: CapCrunchOffense; revealed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 px-2 select-none">
      {/* WRs */}
      <div className="flex justify-center gap-2">
        <PlayerSlot position="WR" player={offense.WR[0]} revealed={revealed} />
        <PlayerSlot position="WR" player={offense.WR[1]} revealed={revealed} />
        <PlayerSlot position="WR" player={offense.WR[2]} revealed={revealed} />
      </div>
      {/* OL */}
      <div className="flex justify-center gap-1.5">
        <PlayerSlot position="LT" player={offense.OL[0]} revealed={revealed} />
        <PlayerSlot position="LG" player={offense.OL[1]} revealed={revealed} />
        <PlayerSlot position="C" player={offense.OL[2]} revealed={revealed} />
        <PlayerSlot position="RG" player={offense.OL[3]} revealed={revealed} />
        <PlayerSlot position="RT" player={offense.OL[4]} revealed={revealed} />
      </div>
      {/* QB */}
      <div className="flex justify-center">
        <PlayerSlot position="QB" player={offense.QB} revealed={revealed} />
      </div>
      {/* RB + TE */}
      <div className="flex justify-center gap-6">
        <PlayerSlot position="RB" player={offense.RB} revealed={revealed} />
        <PlayerSlot position="TE" player={offense.TE} revealed={revealed} />
      </div>
    </div>
  )
}

// ---- Comparison tiles ----

const COMPARISON_COLUMNS: Array<{ label: string; key: keyof CapCrunchComparison }> = [
  { label: "QB", key: "QB" },
  { label: "RB", key: "RB" },
  { label: "TE", key: "TE" },
  { label: "WR", key: "WR" },
  { label: "OL", key: "OL" },
]

// Arrow points TOWARD the answer (Playerdle convention).
// close-* uses same direction but renders in yellow instead of red.
function comparisonSymbol(result: ComparisonResult): string {
  if (result === "correct") return "✓"
  if (result === "close-high" || result === "high") return "↓"
  return "↑" // close-low | low
}

function ComparisonTile({
  result,
  salary,
  animate,
  delayIndex,
}: {
  result: ComparisonResult
  salary: number
  animate?: boolean
  delayIndex?: number
}) {
  const [revealed, setRevealed] = useState(!animate)

  useEffect(() => {
    if (!animate) return
    const revealAt = ((delayIndex ?? 0) * 0.07 + 0.15) * 1000
    const timer = setTimeout(() => setRevealed(true), revealAt)
    return () => clearTimeout(timer)
  }, [animate, delayIndex])

  let bgClass: string
  let textClass: string
  if (!revealed) {
    bgClass = "bg-primary-200 dark:bg-primary-700"
    textClass = "text-primary-200 dark:text-primary-700"
  } else if (result === "correct") {
    bgClass = "bg-success-500 dark:bg-success-600"
    textClass = "text-primary-50"
  } else if (result === "close-high" || result === "close-low") {
    bgClass = "bg-warning-500 dark:bg-warning-600"
    textClass = "text-primary-50"
  } else {
    bgClass = "bg-error-500 dark:bg-error-600"
    textClass = "text-primary-50"
  }

  const symbol = comparisonSymbol(result)
  const delayClass = `tile-delay-${Math.min(delayIndex ?? 0, 9)}`

  return (
    <div
      className={clsx(
        "group grid-cell-size relative flex items-center justify-center font-bold leading-tight p-1 rounded-md transition-colors duration-150 cursor-default",
        bgClass,
        textClass,
        animate && "animate-cell-flip",
        animate && delayClass,
      )}
    >
      <span className="relative z-10 grid-cell-text text-center wrap-break-words">
        {revealed ? formatSalary(salary) : ""}
        {revealed && <span className="ml-0.5 grid-cell-text">{symbol}</span>}
      </span>
    </div>
  )
}

function ComparisonRow({
  teamName,
  comparison,
  guessedSalaries,
  animate,
}: {
  teamName: string
  comparison: CapCrunchComparison
  guessedSalaries: Record<keyof CapCrunchComparison, number>
  animate?: boolean
}) {
  return (
    <div>
      <div className="px-2 py-1 text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none">
        {teamName}
      </div>
      <div className="flex gap-1 justify-center">
        {COMPARISON_COLUMNS.map(({ key }, i) => (
          <ComparisonTile
            key={key}
            result={comparison[key]}
            salary={guessedSalaries[key]}
            animate={animate}
            delayIndex={i}
          />
        ))}
      </div>
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
    () =>
      new Fuse(teams, {
        keys: ["name", "abbr"],
        threshold: 0.35,
        distance: 50,
      }),
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
        if (seen.has(r.item.id)) continue
        if (usedIds.has(r.item.id)) continue
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

// ---- Results panel ----

function buildShareText(
  puzzle: CapCrunchPuzzle,
  guesses: CapCrunchGuessRecord[],
  won: boolean,
  comparisons: CapCrunchComparison[],
): string {
  const score = won ? `${guesses.length}/${CAPCRUNCH_MAX_GUESSES}` : `X/${CAPCRUNCH_MAX_GUESSES}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const emojiGrid = comparisons
    .map(c => {
      const keys: Array<keyof CapCrunchComparison> = ["QB", "RB", "TE", "WR", "OL"]
      return keys
        .map(k => {
          const v = c[k]
          if (v === "correct") return "🟩"
          if (v === "close-high" || v === "close-low") return "🟨"
          return "🟥"
        })
        .join("")
    })
    .join("\n")

  const league = puzzle.league.toUpperCase()
  return `Cap Crunch ${league} (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}/capcrunch`
}

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
  puzzle: CapCrunchPuzzle
  guesses: CapCrunchGuessRecord[]
  comparisons: CapCrunchComparison[]
  won: boolean
  mode: CapCrunchGameMode
  stats: CapCrunchStats | null
  onClose: () => void
  onPlayAgain: () => void
}) {
  const { share, copied } = useClipboardShare()
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function handleShare() {
    share({
      title: "Cap Crunch",
      text: buildShareText(puzzle, guesses, won, comparisons),
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pb-4">
      <Popup visible={copied} message="Copied to clipboard!" durationMs={3000} />
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 mt-4 w-full max-w-2xl mx-auto"
      >
        {mode === "daily" && stats && (
          <div className="mt-4">
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
                <div key={label} className="text-center">
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
            {Array.from({ length: CAPCRUNCH_MAX_GUESSES }, (_, i) => i + 1).map(num => {
              const count = stats.guessDistribution[num] || 0
              const scaledWidth = maxBar > 0 ? (count / maxBar) * 100 : 0
              const barWidth = count === 0 ? "2.25rem" : `${Math.max(scaledWidth, 12)}%`
              const isHighlighted = won && num === guesses.length
              return (
                <div key={num} className="flex items-center mb-1 gap-2">
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
          {mode === "daily" && <ShareButton copied={copied} onClick={handleShare} />}
          <PlayAgainButton onClick={() => { onPlayAgain(); onClose() }} />
        </div>
      </div>
      <ScrollHint scrollRef={scrollRef} />
    </div>
  )
}

// ---- Main game ----

export default function CapCrunchGame({ league, mode, onModeChange, onGameOver, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<CapCrunchGameMode>(mode)
  const teams = useMemo(() => getCapCrunchTeams(league), [league])
  const teamOptions: TeamOption[] = useMemo(
    () => teams.map(t => ({ id: t.id, name: t.name, abbr: t.abbr })),
    [teams],
  )
  const teamsById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams])

  const [puzzle, setPuzzle] = useState<CapCrunchPuzzle>(() =>
    mode === "daily"
      ? archiveDateKey
        ? getCapCrunchPuzzleByDateKey(league, archiveDateKey)
        : getCapCrunchDailyPuzzle(league)
      : getCapCrunchArcadePuzzle(league),
  )

  const [guesses, setGuesses] = useState<CapCrunchGuessRecord[]>(() =>
    mode === "daily" ? loadCapCrunchDailyGuesses(league, puzzle.dateKey) : [],
  )

  const usedIds = useMemo(() => new Set(guesses.map(g => g.teamId)), [guesses])

  const won = guesses.some(g => g.teamId === puzzle.team.id)
  const lost = !won && guesses.length >= CAPCRUNCH_MAX_GUESSES
  const gameOver = won || lost

  const comparisons: CapCrunchComparison[] = useMemo(
    () =>
      guesses.map(g => {
        const guessedTeam = teamsById.get(g.teamId)
        if (!guessedTeam) return { QB: "low", RB: "low", TE: "low", WR: "low", OL: "low" } as CapCrunchComparison
        const cmp = compareTeamToAnswer(guessedTeam, puzzle.team)
        if (guessedTeam.id === puzzle.team.id) {
          return { QB: "correct", RB: "correct", TE: "correct", WR: "correct", OL: "correct" }
        }
        return cmp
      }),
    [guesses, puzzle.team, teamsById],
  )

  const [stats, setStats] = useState<CapCrunchStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateCapCrunchStats(league) : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      if (puzzle.dateKey === getTodayKey()) markCapCrunchPlayed(league)
      saveCapCrunchResult(league, puzzle.dateKey, won, guesses.length)
    }
  }, [league, activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateCapCrunchStats(league))
    }
  }, [gameOver, activeMode, stats, league])

  const prevGameOverRef = useRef(false)
  useEffect(() => {
    if (gameOver && !prevGameOverRef.current) {
      prevGameOverRef.current = true
      onGameOver?.(won, guesses.length)
    }
  }, [gameOver, won, guesses.length, onGameOver])

  useWinConfetti({
    won,
    colors: ["#22c55e", "#16a34a", "#4ade80"],
    dedupKey: `${puzzle.dateKey}:${puzzle.team.id}:${guesses.length}`,
  })

  function handleGuess(team: TeamOption) {
    if (gameOver) return
    if (usedIds.has(team.id)) return
    const next: CapCrunchGuessRecord[] = [...guesses, { teamId: team.id, teamName: team.name }]
    setGuesses(next)
    if (activeMode === "daily") saveCapCrunchDailyGuesses(league, puzzle.dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getCapCrunchArcadePuzzle(league, puzzle.team.id)
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
    const el = rowRefs.current[latestIndex]
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex])

  const prevGuessCount = useRef(guesses.length)
  useEffect(() => {
    if (guesses.length > prevGuessCount.current) {
      setLatestIndex(guesses.length - 1)
    }
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
          {/* Formation */}
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 mt-4 mx-1">
            <div className="text-center py-2 bg-primary-100 dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 rounded-t-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
                Offensive Payroll — Which Team?
              </span>
            </div>
            <Formation offense={puzzle.team.offense} revealed={gameOver} />
          </div>

          {/* Guess grid */}
          <div className="guess-grid-shell flex flex-col items-center gap-3 px-2 pt-1 pb-1 mt-3">
            {/* Column headers — shown once */}
            <div className="guess-grid-header sticky top-0 z-20 flex gap-1 justify-center py-1 bg-primary-50 dark:bg-primary-900">
              {COMPARISON_COLUMNS.map(({ label }) => (
                <div
                  key={label}
                  className="grid-cell-width text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Filled and empty guess rows */}
            {Array.from({ length: CAPCRUNCH_MAX_GUESSES }).map((_, i) =>
              i < guesses.length ? (
                <div
                  key={i}
                  ref={el => { rowRefs.current[i] = el }}
                >
                  <ComparisonRow
                    teamName={guesses[i].teamName}
                    comparison={comparisons[i]}
                    guessedSalaries={(() => {
                      const t = teamsById.get(guesses[i].teamId)
                      if (!t) return { QB: 0, RB: 0, TE: 0, WR: 0, OL: 0 }
                      return {
                        QB: t.offense.QB.salary,
                        RB: t.offense.RB.salary,
                        TE: t.offense.TE.salary,
                        WR: t.offense.WR.reduce((s, p) => s + p.salary, 0),
                        OL: t.offense.OL.reduce((s, p) => s + p.salary, 0),
                      }
                    })()}
                    animate={i === latestIndex}
                  />
                </div>
              ) : (
                <div
                  key={`empty-${i}`}
                  ref={el => { rowRefs.current[i] = el }}
                >
                  <div className="flex gap-1 justify-center">
                    {COMPARISON_COLUMNS.map(({ key }) => (
                      <div
                        key={key}
                        className="grid-cell-size rounded-md bg-primary-50 border border-primary-200 dark:bg-primary-900 dark:border-primary-600"
                      />
                    ))}
                  </div>
                </div>
              ),
            )}
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
