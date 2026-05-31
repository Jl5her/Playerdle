import clsx from "clsx"
import Fuse from "fuse.js"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getSchoolLogoUrl, isFlag } from "@/games/collegecourt/utils/college-logos"
import {
  calculateCollegeCourtStats,
  compareTeamToAnswer,
  getCollegeCourtArcadePuzzle,
  getCollegeCourtDailyPuzzle,
  getCollegeCourtPuzzleByDateKey,
  getCollegeCourtTeams,
  loadCollegeCourtDailyGuesses,
  markCollegeCourtPlayed,
  saveCollegeCourtDailyGuesses,
  saveCollegeCourtResult,
  COLLEGECOURT_MAX_GUESSES,
  POSITIONS,
  type CollegeCourtComparison,
  type CollegeCourtGuessRecord,
  type CollegeCourtPuzzle,
  type CollegeCourtStats,
  type CollegeCourtTeam,
  type CollegeStarter,
  type PositionResult,
} from "@/games/collegecourt/utils/collegecourt-daily"
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

export type CollegeCourtGameMode = "daily" | "arcade"

interface Props {
  mode: CollegeCourtGameMode
  onModeChange?: (mode: CollegeCourtGameMode) => void
  onGameOver?: (won: boolean, guessCount: number) => void
  archiveDateKey?: string
}

// ---- College badge (used on court + in guess rows) ----

function CollegeBadge({
  starter,
  size = "md",
  matchResult,
  showTooltip = false,
  showPlayerName = true,
}: {
  starter: CollegeStarter
  size?: "sm" | "md" | "lg"
  matchResult?: PositionResult
  showTooltip?: boolean
  showPlayerName?: boolean
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

  // Border color drives match feedback; background stays white for logo clarity
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
        style={
          !showLogo
            ? { backgroundColor: starter.colors[0] }
            : undefined
        }
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
            {showPlayerName ? `${starter.name} · ${starter.school}` : starter.school}
          </div>,
          document.body,
        )}
    </>
  )
}

// ---- Half-court diagram ----

function HalfCourt({ team, showTooltip = false }: { team: CollegeCourtTeam; showTooltip?: boolean }) {
  const positions: Array<{ pos: "PG" | "SG" | "SF" | "PF" | "C"; x: string; y: string }> = [
    { pos: "PG", x: "50%", y: "34%" },
    { pos: "SG", x: "15%", y: "51%" },
    { pos: "SF", x: "78%", y: "44%" },
    { pos: "PF", x: "30%", y: "64%" },
    { pos: "C",  x: "50%", y: "73%" },
  ]

  return (
    <div className="relative w-full" style={{ paddingBottom: "70%" }}>
      {/* Hardwood court surface — parent card clips rounded corners */}
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#c49868" }}>
        <svg
          viewBox="0 0 300 186"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Vertical plank pattern: tiles every 16px horizontally, full 186px tall */}
            <pattern id="wood-planks" patternUnits="userSpaceOnUse" x="0" y="0" width="16" height="186">
              {/* Plank A — lighter maple */}
              <rect x="0" y="0" width="8" height="186" fill="#d2a87a"/>
              <line x1="2"   y1="0" x2="2.8" y2="186" stroke="rgba(60,30,0,0.06)" strokeWidth="0.5"/>
              <line x1="5"   y1="0" x2="5.6" y2="186" stroke="rgba(60,30,0,0.04)" strokeWidth="0.35"/>
              {/* Plank B — slightly darker maple */}
              <rect x="8" y="0" width="8" height="186" fill="#c49868"/>
              <line x1="10"  y1="0" x2="10.8" y2="186" stroke="rgba(60,30,0,0.06)" strokeWidth="0.5"/>
              <line x1="13"  y1="0" x2="13.6" y2="186" stroke="rgba(60,30,0,0.04)" strokeWidth="0.35"/>
              {/* Board separators */}
              <line x1="7.5" y1="0" x2="7.5"  y2="186" stroke="rgba(40,20,0,0.22)" strokeWidth="0.6"/>
              <line x1="15.5" y1="0" x2="15.5" y2="186" stroke="rgba(40,20,0,0.22)" strokeWidth="0.6"/>
            </pattern>
          </defs>
          {/* Wood plank fill behind all court markings */}
          <rect width="300" height="186" fill="url(#wood-planks)"/>
          <rect x="3" y="3" width="294" height="180" rx="4" fill="none" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <path d="M 22 183 A 128 128 0 0 1 278 183" fill="none" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <line x1="22" y1="140" x2="22" y2="183" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <line x1="278" y1="140" x2="278" y2="183" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <rect x="102" y="130" width="96" height="56" fill="rgba(40,20,0,0.08)" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <line x1="102" y1="130" x2="198" y2="130" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <path d="M 102 130 A 48 48 0 0 1 198 130" fill="none" stroke="rgba(40,20,0,0.5)" strokeWidth="1.5" />
          <path d="M 102 130 A 48 48 0 0 0 198 130" fill="none" stroke="rgba(40,20,0,0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 124 183 A 26 26 0 0 1 176 183" fill="none" stroke="rgba(40,20,0,0.4)" strokeWidth="1.2" />
          <line x1="127" y1="183" x2="173" y2="183" stroke="rgba(40,20,0,0.7)" strokeWidth="2.5" />
          <ellipse cx="150" cy="181" rx="10" ry="3.5" fill="none" stroke="rgba(40,20,0,0.85)" strokeWidth="1.8" />
          <line x1="3" y1="3" x2="297" y2="3" stroke="rgba(40,20,0,0.3)" strokeWidth="1" />
        </svg>
      </div>

      {positions.map(({ pos, x, y }) => (
        <div
          key={pos}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <CollegeBadge starter={team.starters[pos]} size="lg" showTooltip showPlayerName={showTooltip} />
            <span className="text-[11px] font-black text-white drop-shadow leading-none">
              {POSITIONS.indexOf(pos) + 1}
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
  guessedTeam: CollegeCourtTeam
  comparison: CollegeCourtComparison
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

// ---- Share text ----

function buildShareText(
  guesses: CollegeCourtGuessRecord[],
  comparisons: CollegeCourtComparison[],
  won: boolean,
): string {
  const score = won ? `${guesses.length}/${COLLEGECOURT_MAX_GUESSES}` : `X/${COLLEGECOURT_MAX_GUESSES}`
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  const emojiGrid = comparisons
    .map(c => POSITIONS.map(p => (c[p] === "correct" ? "🟩" : "⬜")).join(""))
    .join("\n")

  return `Schooled NBA (${dateStr}) — ${score}\n${emojiGrid}\n\n${window.location.origin}/collegecourt`
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
  puzzle: CollegeCourtPuzzle
  guesses: CollegeCourtGuessRecord[]
  comparisons: CollegeCourtComparison[]
  won: boolean
  mode: CollegeCourtGameMode
  stats: CollegeCourtStats | null
  onClose: () => void
  onPlayAgain: () => void
}) {
  const { share, copied } = useClipboardShare()
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxBar = stats ? Math.max(...Object.values(stats.guessDistribution), 1) : 1

  function handleShare() {
    share({
      title: "Schooled",
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
            {puzzle.team.name} — Starting Five
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
            {Array.from({ length: COLLEGECOURT_MAX_GUESSES }, (_, i) => i + 1).map(num => {
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

export default function CollegeCourtGame({ mode, onModeChange, onGameOver, archiveDateKey }: Props) {
  const [activeMode, setActiveMode] = useState<CollegeCourtGameMode>(mode)
  const allTeams = useMemo(() => getCollegeCourtTeams(), [])
  const teamOptions: TeamOption[] = useMemo(
    () => allTeams.map(t => ({ id: t.id, name: t.name, abbr: t.abbr })),
    [allTeams],
  )
  const teamsById = useMemo(() => new Map(allTeams.map(t => [t.id, t])), [allTeams])

  const [puzzle, setPuzzle] = useState<CollegeCourtPuzzle>(() =>
    mode === "daily"
      ? archiveDateKey
        ? getCollegeCourtPuzzleByDateKey(archiveDateKey)
        : getCollegeCourtDailyPuzzle()
      : getCollegeCourtArcadePuzzle(),
  )

  const [guesses, setGuesses] = useState<CollegeCourtGuessRecord[]>(() =>
    mode === "daily" ? loadCollegeCourtDailyGuesses(puzzle.dateKey) : [],
  )

  const usedIds = useMemo(() => new Set(guesses.map(g => g.teamId)), [guesses])

  const won = guesses.some(g => g.teamId === puzzle.team.id)
  const lost = !won && guesses.length >= COLLEGECOURT_MAX_GUESSES
  const gameOver = won || lost

  const comparisons: CollegeCourtComparison[] = useMemo(
    () =>
      guesses.map(g => {
        const guessedTeam = teamsById.get(g.teamId)
        if (!guessedTeam)
          return { PG: "incorrect", SG: "incorrect", SF: "incorrect", PF: "incorrect", C: "incorrect" } as CollegeCourtComparison
        if (guessedTeam.id === puzzle.team.id)
          return { PG: "correct", SG: "correct", SF: "correct", PF: "correct", C: "correct" } as CollegeCourtComparison
        return compareTeamToAnswer(guessedTeam, puzzle.team)
      }),
    [guesses, puzzle.team, teamsById],
  )

  const [stats, setStats] = useState<CollegeCourtStats | null>(() =>
    gameOver && activeMode === "daily" ? calculateCollegeCourtStats() : null,
  )

  useEffect(() => {
    if (activeMode === "daily" && gameOver) {
      if (puzzle.dateKey === getTodayKey()) markCollegeCourtPlayed()
      saveCollegeCourtResult(puzzle.dateKey, won, guesses.length)
    }
  }, [activeMode, gameOver, puzzle.dateKey, won, guesses.length])

  useEffect(() => {
    if (!gameOver) {
      setStats(null)
      return
    }
    if (activeMode === "daily" && stats === null) {
      setStats(calculateCollegeCourtStats())
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
    const next: CollegeCourtGuessRecord[] = [...guesses, { teamId: team.id, teamName: team.name }]
    setGuesses(next)
    if (activeMode === "daily") saveCollegeCourtDailyGuesses(puzzle.dateKey, next)
  }

  function handlePlayAgain() {
    const fresh = getCollegeCourtArcadePuzzle(puzzle.team.id)
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
          {/* Half-court diagram — overflow-hidden lets parent card clip the rounded corners */}
          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-700 mt-3 mx-1 overflow-hidden">
            <HalfCourt team={puzzle.team} showTooltip={won} />
          </div>

          {/* Guess grid */}
          <div className="mt-4">
            {/* Single column header row */}
            <div className="flex gap-1.5 justify-center mb-2 sticky top-0 z-10 bg-primary-50 dark:bg-primary-900 py-1">
              {POSITIONS.map((pos, i) => (
                <div key={pos} className="w-12 text-center text-xs font-bold tracking-wide text-primary-900 dark:text-primary-50">
                  {i + 1}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: COLLEGECOURT_MAX_GUESSES }).map((_, i) =>
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
