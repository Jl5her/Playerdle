import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getSchoolLogoUrl, isFlag } from "@/games/collegecourt/utils/college-logos"
import {
  calculateCollegeFieldStats,
  compareTeamToAnswer,
  getCollegeFieldArcadePuzzle,
  getCollegeFieldDailyPuzzle,
  getCollegeFieldPuzzleByDateKey,
  getCollegeFieldTeams,
  loadCollegeFieldDailyGuesses,
  markCollegeFieldPlayed,
  saveCollegeFieldDailyGuesses,
  saveCollegeFieldResult,
  COLLEGEFIELD_MAX_GUESSES,
  POSITIONS,
  type CollegeFieldComparison,
  type CollegeFieldGuessRecord,
  type CollegeFieldPuzzle,
  type CollegeFieldStats,
  type CollegeFieldTeam,
  type CollegeStarter,
  type PositionResult,
} from "@/games/collegefield/utils/collegefield-daily"
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

export type CollegeFieldGameMode = "daily" | "arcade"

interface Props {
  mode: CollegeFieldGameMode
  onModeChange?: (mode: CollegeFieldGameMode) => void
  onGameOver?: (won: boolean, guessCount: number) => void
  archiveDateKey?: string
}

// ---- College badge ----

function CollegeBadge({
  starter,
  size = "md",
  matchResult,
  showTooltip = false,
}: {
  starter: CollegeStarter
  size?: "sm" | "md" | "lg"
  matchResult?: PositionResult
  showTooltip?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastPointerTypeRef = useRef<string>("mouse")
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)

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

  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  }

  const logoUrl = getSchoolLogoUrl(starter.schoolAbbr)
  const flag = isFlag(starter.schoolAbbr)
  const showLogo = logoUrl && !imgFailed

  const borderClass = matchResult === "correct"
    ? "border-green-500 ring-2 ring-green-400/50"
    : matchResult === "incorrect"
      ? "border-gray-500"
      : "border-white/40"

  const bgClass = matchResult === "correct"
    ? "bg-green-50"
    : matchResult === "incorrect"
      ? "bg-gray-700/60"
      : "bg-white"

  return (
    <>
      <div
        ref={ref}
        className={clsx(
          "rounded-full flex items-center justify-center select-none cursor-pointer border-2 transition-colors overflow-hidden",
          sizeClasses[size],
          borderClass,
          showLogo ? bgClass : "bg-primary-800",
        )}
        style={!showLogo ? { backgroundColor: starter.colors[0] } : undefined}
        onPointerDown={e => { lastPointerTypeRef.current = e.pointerType }}
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
        {showLogo ? (
          <img
            src={logoUrl}
            alt={starter.school}
            className={clsx(
              "object-contain select-none pointer-events-none",
              flag ? "w-full h-full" : "w-[78%] h-[78%]",
              matchResult === "incorrect" && "opacity-60",
            )}
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          <span
            className="font-black tracking-tight text-white leading-none"
            style={{ fontSize: size === "lg" ? 11 : size === "md" ? 10 : 9 }}
          >
            {starter.schoolAbbr}
          </span>
        )}
      </div>
      {tooltipPos && showTooltip &&
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
            {starter.name} · {starter.school}
          </div>,
          document.body,
        )}
    </>
  )
}

// ---- Football field diagram ----

function FootballField({ team }: { team: CollegeFieldTeam }) {
  const positions: Array<{ pos: "QB" | "RB" | "TE" | "WR1" | "WR2"; x: string; y: string }> = [
    { pos: "WR1", x: "8%",  y: "44%" },
    { pos: "WR2", x: "92%", y: "44%" },
    { pos: "TE",  x: "74%", y: "54%" },
    { pos: "QB",  x: "50%", y: "66%" },
    { pos: "RB",  x: "50%", y: "80%" },
  ]

  return (
    <div className="relative w-full" style={{ paddingBottom: "66%" }}>
      {/* Field surface — overflow-hidden for rounded corners */}
      <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backgroundColor: "#2d5a27" }}>
        <svg
          viewBox="0 0 300 198"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* End zone */}
          <rect x="0" y="0" width="300" height="32" fill="rgba(0,0,0,0.18)" />
          <text x="150" y="21" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="12" fontWeight="bold" letterSpacing="4">TOUCHDOWN</text>
          {/* Yard lines */}
          <line x1="0" y1="32"  x2="300" y2="32"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
          <line x1="0" y1="64"  x2="300" y2="64"  stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1="0" y1="96"  x2="300" y2="96"  stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1="0" y1="128" x2="300" y2="128" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1="0" y1="160" x2="300" y2="160" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* Left hash marks */}
          <line x1="97"  y1="32"  x2="97"  y2="36"  stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="97"  y1="64"  x2="97"  y2="68"  stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="97"  y1="96"  x2="97"  y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="97"  y1="128" x2="97"  y2="132" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="97"  y1="160" x2="97"  y2="164" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          {/* Right hash marks */}
          <line x1="203" y1="32"  x2="203" y2="36"  stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="203" y1="64"  x2="203" y2="68"  stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="203" y1="96"  x2="203" y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="203" y1="128" x2="203" y2="132" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          <line x1="203" y1="160" x2="203" y2="164" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          {/* Goal post */}
          <line x1="150" y1="0"  x2="150" y2="18" stroke="rgba(255,215,0,0.8)" strokeWidth="2.5" />
          <line x1="134" y1="6"  x2="166" y2="6"  stroke="rgba(255,215,0,0.8)" strokeWidth="2.5" />
          <line x1="134" y1="0"  x2="134" y2="6"  stroke="rgba(255,215,0,0.8)" strokeWidth="2" />
          <line x1="166" y1="0"  x2="166" y2="6"  stroke="rgba(255,215,0,0.8)" strokeWidth="2" />
          {/* Field border */}
          <rect x="2" y="2" width="296" height="194" rx="4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Badges sit outside overflow-hidden so they never clip */}
      {positions.map(({ pos, x, y }) => (
        <div
          key={pos}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <CollegeBadge starter={team.starters[pos]} size="lg" showTooltip />
            <span className="text-[8px] font-black uppercase tracking-widest text-white drop-shadow leading-none">
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
  starter: CollegeStarter
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
    <CollegeBadge starter={starter} size="md" matchResult={matchResult} showTooltip />
  ) : (
    <div className="w-12 h-12 rounded-full bg-primary-200 dark:bg-primary-700" />
  )
}

function GuessRow({
  teamName,
  guessedTeam,
  comparison,
  animate,
}: {
  teamName: string
  guessedTeam: CollegeFieldTeam
  comparison: CollegeFieldComparison
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

function EmptyRow() {
  return (
    <div className="flex gap-1.5 justify-center">
      {POSITIONS.map(pos => (
        <div key={pos} className="w-12 h-12 rounded-full border border-primary-200 dark:border-primary-700" />
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
                onPointerDown={e => { e.preventDefault(); handleSelect(option) }}
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
  guesses: CollegeFieldGuessRecord[],
  comparisons: CollegeFieldComparison[],
  won: boolean,
): string {
  const score = won ? `${guesses.length}/${COLLEGEFIELD_MAX_GUESSES}` : `X/${COLLEGEFIELD_MAX_GUESSES}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const emojiGrid = comparisons
    .map(c => POSITIONS.map(p => (c[p] === "correct" ? "🟩" : "⬜")).join(""))
    .join("\n")

  return `CollegeField NFL (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}/collegefield`
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
  puzzle: CollegeFieldPuzzle
  guesses: CollegeFieldGuessRecord[]
  comparisons: CollegeFieldComparison[]
  won: boolean
  mode: CollegeFieldGameMode
  stats: CollegeFieldStats | null
  onClose: () => void
  onPlayAgain: () => void
}) {
  const { share, copied } = useClipboardShare()
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function handleShare() {
    share({
      title: "CollegeField",
      text: buildShareText(guesses, comparisons, won),
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pb-4">
      <Popup visible={copied} message="Copied to clipboard!" durationMs={3000} />
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 mt-4 w-full max-w-2xl mx-auto"
      >
        {/* Answer reveal */}
        <div className="mb-4 rounded-xl border border-primary-200 dark:border-primary-700 overflow-hidden">
          <div className="bg-primary-100 dark:bg-primary-800 py-2 text-center text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
            {puzzle.team.name} — Starting Offense
          </div>
          <div className="flex gap-3 justify-center py-3 px-2 flex-wrap">
            {POSITIONS.map(pos => {
              const starter = puzzle.team.starters[pos]
              return (
                <div key={pos} className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">
                    {pos}
                  </span>
                  <CollegeBadge starter={starter} size="lg" showTooltip />
                  <span className="text-[9px] font-semibold text-primary-800 dark:text-primary-100 max-w-[3.5rem] text-center leading-tight line-clamp-2">
                    {starter.name}
                  </span>
                  <span className="text-[8px] text-primary-500 dark:text-primary-400 max-w-[3.5rem] text-center leading-tight line-clamp-2">
                    {starter.school}
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
                <div key={label} className="text-center">
                  <div className="text-4xl font-light text-primary-900 dark:text-primary-50">{value}</div>
                  <div className="text-xs text-primary-500 dark:text-primary-200 mt-1 font-light leading-tight whitespace-pre-line">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 mb-3 uppercase">
              Guess Distribution
            </h3>
            {Array.from({ length: COLLEGEFIELD_MAX_GUESSES }, (_, i) => i + 1).map(num => {
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

export default function CollegeFieldGame({ mode, onModeChange, onGameOver, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<CollegeFieldGameMode>(mode)
  const allTeams = useMemo(() => getCollegeFieldTeams(), [])
  const teamOptions: TeamOption[] = useMemo(
    () => allTeams.map(t => ({ id: t.id, name: t.name, abbr: t.abbr })),
    [allTeams],
  )
  const teamsById = useMemo(() => new Map(allTeams.map(t => [t.id, t])), [allTeams])

  const [puzzle, setPuzzle] = useState<CollegeFieldPuzzle>(() =>
    mode === "daily"
      ? archiveDateKey
        ? getCollegeFieldPuzzleByDateKey(archiveDateKey)
        : getCollegeFieldDailyPuzzle()
      : getCollegeFieldArcadePuzzle(),
  )

  const [guesses, setGuesses] = useState<CollegeFieldGuessRecord[]>(() =>
    mode === "daily" ? loadCollegeFieldDailyGuesses(puzzle.dateKey) : [],
  )

  const usedIds = useMemo(() => new Set(guesses.map(g => g.teamId)), [guesses])

  const won = guesses.some(g => g.teamId === puzzle.team.id)
  const lost = !won && guesses.length >= COLLEGEFIELD_MAX_GUESSES
  const gameOver = won || lost

  const comparisons: CollegeFieldComparison[] = useMemo(
    () =>
      guesses.map(g => {
        const guessedTeam = teamsById.get(g.teamId)
        if (!guessedTeam)
          return { QB: "incorrect", RB: "incorrect", TE: "incorrect", WR1: "incorrect", WR2: "incorrect" } as CollegeFieldComparison
        if (guessedTeam.id === puzzle.team.id)
          return { QB: "correct", RB: "correct", TE: "correct", WR1: "correct", WR2: "correct" } as CollegeFieldComparison
        return compareTeamToAnswer(guessedTeam, puzzle.team)
      }),
    [guesses, puzzle.team, teamsById],
  )

  const [stats, setStats] = useState<CollegeFieldStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateCollegeFieldStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      if (puzzle.dateKey === getTodayKey()) markCollegeFieldPlayed()
      saveCollegeFieldResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateCollegeFieldStats())
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
    if (gameOver) return
    if (usedIds.has(team.id)) return
    const next: CollegeFieldGuessRecord[] = [...guesses, { teamId: team.id, teamName: team.name }]
    setGuesses(next)
    if (activeMode === "daily") saveCollegeFieldDailyGuesses(puzzle.dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getCollegeFieldArcadePuzzle(puzzle.team.id)
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
          {/* Football field diagram */}
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 mt-3 mx-1">
            <div className="text-center py-2 bg-primary-100 dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 rounded-t-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-300">
                Which NFL Team? — Tap a badge for player details
              </span>
            </div>
            <div className="px-5 pt-1 pb-3">
              <FootballField team={puzzle.team} />
            </div>
          </div>

          {/* Guess grid */}
          <div className="mt-4">
            <div className="flex gap-1.5 justify-center mb-2 sticky top-0 z-10 bg-primary-50 dark:bg-primary-900 py-1">
              {POSITIONS.map(pos => (
                <div key={pos} className="w-12 text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50">
                  {pos}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: COLLEGEFIELD_MAX_GUESSES }).map((_, i) =>
                i < guesses.length ? (
                  <div key={i} ref={el => { rowRefs.current[i] = el }}>
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
                  <div key={`empty-${i}`} ref={el => { rowRefs.current[i] = el }}>
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
