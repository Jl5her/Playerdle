import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CAPCRUNCH_MAX_GUESSES,
  type CapCrunchColumn,
  type CapCrunchComparison,
  type CapCrunchFormationSlot,
  type CapCrunchGuessRecord,
  type CapCrunchLeague,
  type CapCrunchLeagueConfig,
  type CapCrunchPlayer,
  type CapCrunchPuzzle,
  type CapCrunchStats,
  type CapCrunchTeam,
  type ComparisonResult,
  calculateCapCrunchStats,
  compareTeamToAnswer,
  getCapCrunchArcadePuzzle,
  getCapCrunchDailyPuzzle,
  getCapCrunchLeagueConfig,
  getCapCrunchPuzzleByDateKey,
  getCapCrunchTeams,
  loadCapCrunchDailyGuesses,
  markCapCrunchPlayed,
  saveCapCrunchDailyGuesses,
  saveCapCrunchResult,
  teamColumnSalaries,
  uniformComparison,
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

// ---- Tooltip plumbing ----

/** Shared tap/hover tooltip behavior for a formation slot. */
function useSlotTooltip(revealed: boolean) {
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

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      lastPointerTypeRef.current = e.pointerType
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && revealed) setTooltipPos(computePos())
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setTooltipPos(null)
    },
    onClick: () => {
      if (revealed && lastPointerTypeRef.current !== "mouse") {
        setTooltipPos(prev => (prev ? null : computePos()))
      }
    },
  }

  return { ref, tooltipPos, handlers }
}

function SlotTooltip({ pos, label }: { pos: { x: number; y: number }; label: string }) {
  return createPortal(
    <div
      className="pointer-events-none whitespace-nowrap rounded-md bg-primary-900 dark:bg-primary-100 text-primary-50 dark:text-primary-900 text-xs font-semibold px-2 py-1 shadow-lg"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y - 8,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      }}
    >
      {label}
    </div>,
    document.body,
  )
}

function slotTooltipLabel(player: CapCrunchPlayer): string {
  return player.number != null ? `${player.name} #${player.number}` : player.name
}

// ---- Formation: NFL football field (Madden layout) ----

function FieldPlayerSlot({
  position,
  player,
  revealed,
}: {
  position: string
  player: CapCrunchPlayer
  revealed: boolean
}) {
  const { ref, tooltipPos, handlers } = useSlotTooltip(revealed)

  return (
    <>
      <div
        ref={ref}
        className="flex flex-col items-center gap-0.5 select-none"
        {...handlers}
      >
        <div
          className="relative flex items-center justify-center cursor-pointer"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "#0f172a",
            border: "2.5px solid rgba(255,255,255,0.55)",
          }}
        >
          <span className="font-black text-white text-[9px] leading-none tabular-nums">
            {formatSalary(player.salary)}
          </span>
        </div>
        <span
          className="text-[8px] font-black uppercase tracking-widest text-white leading-none"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
        >
          {position}
        </span>
      </div>
      {tooltipPos && (
        <SlotTooltip
          pos={tooltipPos}
          label={slotTooltipLabel(player)}
        />
      )}
    </>
  )
}

interface FieldSlot {
  label: string
  player: CapCrunchPlayer
  x: string
  y: string
}

function NflFieldFormation({ team, revealed }: { team: CapCrunchTeam; revealed: boolean }) {
  const wr = team.groups.WR ?? []
  const ol = team.groups.OL ?? []
  const qb = team.groups.QB?.[0]
  const rb = team.groups.RB?.[0]
  const te = team.groups.TE?.[0]

  const layout: Array<{
    label: string
    player: CapCrunchPlayer | undefined
    x: string
    y: string
  }> = [
    { label: "WR", player: wr[0], x: "5%", y: "42%" },
    { label: "WR", player: wr[1], x: "17%", y: "42%" },
    { label: "LT", player: ol[0], x: "28%", y: "42%" },
    { label: "LG", player: ol[1], x: "39%", y: "42%" },
    { label: "C", player: ol[2], x: "50%", y: "42%" },
    { label: "RG", player: ol[3], x: "61%", y: "42%" },
    { label: "RT", player: ol[4], x: "72%", y: "42%" },
    { label: "TE", player: te, x: "83%", y: "46%" },
    { label: "WR", player: wr[2], x: "95%", y: "42%" },
    { label: "QB", player: qb, x: "50%", y: "64%" },
    { label: "RB", player: rb, x: "63%", y: "81%" },
  ]
  const positions = layout.filter((s): s is FieldSlot => s.player != null)

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
          {/* Hash marks — left */}
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
          {/* Hash marks — right */}
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
          {/* WR go routes */}
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
          {/* RB swing route */}
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

      {positions.map(({ label, player, x, y }, i) => (
        <div
          key={`${label}-${i}`}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
        >
          <FieldPlayerSlot
            position={label}
            player={player}
            revealed={revealed}
          />
        </div>
      ))}
    </div>
  )
}

// ---- Formation: generic stacked rows (NBA + default) ----

function RowPlayerSlot({
  position,
  player,
  revealed,
  compact,
}: {
  position: string
  player: CapCrunchPlayer
  revealed: boolean
  compact?: boolean
}) {
  const { ref, tooltipPos, handlers } = useSlotTooltip(revealed)

  return (
    <>
      <div
        ref={ref}
        className={clsx(
          "flex flex-col items-center gap-0.5 select-none",
          compact ? "min-w-[2.75rem]" : "min-w-[3.5rem]",
        )}
        {...handlers}
      >
        <div className="text-[9px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-400">
          {position}
        </div>
        <div
          className={clsx(
            "rounded-lg border-2 border-primary-300 dark:border-primary-600 bg-primary-100 dark:bg-primary-800 flex flex-col items-center py-1.5 gap-0.5 cursor-pointer",
            compact ? "w-11" : "w-14",
          )}
        >
          <span
            className={clsx(
              "font-bold text-primary-400 dark:text-primary-500 truncate w-full text-center px-1",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            {revealed ? player.name : "?"}
          </span>
          {revealed && player.number != null && (
            <span className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 tabular-nums leading-none">
              #{player.number}
            </span>
          )}
          <span
            className={clsx(
              "font-black text-primary-800 dark:text-primary-100 tabular-nums",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {formatSalary(player.salary)}
          </span>
        </div>
      </div>
      {tooltipPos && (
        <SlotTooltip
          pos={tooltipPos}
          label={slotTooltipLabel(player)}
        />
      )}
    </>
  )
}

function RowsFormation({
  team,
  formation,
  revealed,
  compact,
}: {
  team: CapCrunchTeam
  formation: CapCrunchFormationSlot[][]
  revealed: boolean
  compact?: boolean
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center px-2 select-none",
        compact ? "gap-2 py-2" : "gap-3 py-4",
      )}
    >
      {formation.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={clsx("flex justify-center", compact ? "gap-1.5" : "gap-2")}
        >
          {row.map((slot, slotIdx) => {
            const player = team.groups[slot.group]?.[slot.index]
            if (!player) return null
            return (
              <RowPlayerSlot
                key={`${slot.group}-${slot.index}-${slotIdx}`}
                position={slot.label}
                player={player}
                revealed={revealed}
                compact={compact}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Formation({
  team,
  config,
  revealed,
}: {
  team: CapCrunchTeam
  config: CapCrunchLeagueConfig
  revealed: boolean
}) {
  if (config.formationStyle === "field") {
    return (
      <NflFieldFormation
        team={team}
        revealed={revealed}
      />
    )
  }
  return (
    <RowsFormation
      team={team}
      formation={config.formation}
      revealed={revealed}
      compact={config.compactSlots}
    />
  )
}

// ---- Comparison tiles ----

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
  columns,
  comparison,
  guessedSalaries,
  animate,
}: {
  teamName: string
  columns: CapCrunchColumn[]
  comparison: CapCrunchComparison
  guessedSalaries: Record<string, number>
  animate?: boolean
}) {
  return (
    <div>
      <div className="px-2 py-1 text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none">
        {teamName}
      </div>
      <div className="flex gap-1 justify-center">
        {columns.map(({ id }, i) => (
          <ComparisonTile
            key={id}
            result={comparison[id]}
            salary={guessedSalaries[id]}
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

  const config = getCapCrunchLeagueConfig(puzzle.league)
  const emojiGrid = comparisons
    .map(c =>
      config.columns
        .map(col => {
          const v = c[col.id]
          if (v === "correct") return "🟩"
          if (v === "close-high" || v === "close-low") return "🟨"
          return "🟥"
        })
        .join(""),
    )
    .join("\n")

  return `Cap Crunch ${config.shortLabel} (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}${config.basePath}`
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
  const config = getCapCrunchLeagueConfig(puzzle.league)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function handleShare() {
    share({
      title: "Cap Crunch",
      text: buildShareText(puzzle, guesses, won, comparisons),
    })
  }

  // Every player in the formation, with their slot label, ranked by salary.
  const payrollRows = config.formation
    .flat()
    .map(slot => ({ pos: slot.label, player: puzzle.team.groups[slot.group]?.[slot.index] }))
    .filter((r): r is { pos: string; player: CapCrunchPlayer } => r.player != null)
    .sort((a, b) => b.player.salary - a.player.salary)
  const topSalary = payrollRows[0]?.player.salary ?? 1

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
        {/* Payroll table ranked by salary */}
        <div className="mb-4 rounded-xl border border-primary-200 dark:border-primary-700 overflow-hidden">
          <div className="bg-primary-100 dark:bg-primary-800 py-2 text-center text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
            {puzzle.team.name} — Payroll Breakdown
          </div>
          <div className="divide-y divide-primary-100 dark:divide-primary-800">
            {payrollRows.map(({ pos, player }, i) => {
              const barWidth = `${Math.round((player.salary / topSalary) * 100)}%`
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  <span className="text-[10px] font-black uppercase w-6 shrink-0 text-primary-400 dark:text-primary-500">
                    {pos}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-primary-900 dark:text-primary-50 truncate">
                        {player.name}
                      </span>
                      <span className="text-xs font-black tabular-nums text-primary-700 dark:text-primary-200 shrink-0">
                        {formatSalary(player.salary)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-primary-100 dark:bg-primary-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-400 dark:bg-primary-500"
                        style={{ width: barWidth }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
            {Array.from({ length: CAPCRUNCH_MAX_GUESSES }, (_, i) => i + 1).map(num => {
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

export default function CapCrunchGame({
  league,
  mode,
  onModeChange,
  onGameOver,
  archiveDateKey,
}: Props) {
  const [activeMode, setActiveMode] = useState<CapCrunchGameMode>(mode)
  const config = useMemo(() => getCapCrunchLeagueConfig(league), [league])
  const columns = config.columns
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
        if (!guessedTeam) return uniformComparison(league, "low")
        if (guessedTeam.id === puzzle.team.id) return uniformComparison(league, "correct")
        return compareTeamToAnswer(league, guessedTeam, puzzle.team)
      }),
    [guesses, puzzle.team, teamsById, league],
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
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 overflow-hidden bg-primary-50 dark:bg-primary-900 mt-4 mx-1">
            <Formation
              team={puzzle.team}
              config={config}
              revealed={gameOver}
            />
          </div>

          {/* Guess grid */}
          <div className="guess-grid-shell flex flex-col items-center gap-3 px-2 pt-1 pb-1 mt-3">
            {/* Column headers — shown once */}
            <div className="guess-grid-header sticky top-0 z-20 flex gap-1 justify-center py-1 bg-primary-50 dark:bg-primary-900">
              {columns.map(({ id, label }) => (
                <div
                  key={id}
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
                  ref={el => {
                    rowRefs.current[i] = el
                  }}
                >
                  <ComparisonRow
                    teamName={guesses[i].teamName}
                    columns={columns}
                    comparison={comparisons[i]}
                    guessedSalaries={(() => {
                      const t = teamsById.get(guesses[i].teamId)
                      if (!t) return {}
                      return teamColumnSalaries(league, t)
                    })()}
                    animate={i === latestIndex}
                  />
                </div>
              ) : (
                <div
                  key={`empty-${i}`}
                  ref={el => {
                    rowRefs.current[i] = el
                  }}
                >
                  <div className="flex gap-1 justify-center">
                    {columns.map(({ id }) => (
                      <div
                        key={id}
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
