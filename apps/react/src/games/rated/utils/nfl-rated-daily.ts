import nflData from "@playerdle/data/rated/nfl-rated.json"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

export const POSITIONS = ["QB", "RB", "WR1", "WR2", "WR3", "TE"] as const
export type Position = (typeof POSITIONS)[number]

export const OL_POSITIONS = ["LT", "LG", "C", "RG", "RT"] as const
export type OlPosition = (typeof OL_POSITIONS)[number]

export interface RatedStarter {
  name: string
  ovr: number
}

export interface RatedTeam {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  starters: Record<Position, RatedStarter> & Partial<Record<OlPosition, RatedStarter>>
}

const NFL_TEAMS: RatedTeam[] = nflData.teams as unknown as RatedTeam[]

export function getNflRatedTeams(): RatedTeam[] {
  return NFL_TEAMS
}

export function getNflRatedTeamById(id: string): RatedTeam | undefined {
  return NFL_TEAMS.find(t => t.id === id)
}

export const NFL_RATED_EPOCH = "2025-09-01"
export const NFL_RATED_MAX_GUESSES = 5
export const OVR_MATCH_THRESHOLD = 7
export const OVR_CLOSE_MARGIN = 3

const STORAGE_STATE_PREFIX = "playerdle-nfl-rated-state"
const STORAGE_HISTORY_PREFIX = "playerdle-nfl-rated-history:v1"
const STORAGE_PLAYED_PREFIX = "playerdle-nfl-rated-played-day"

export interface NflRatedPuzzle {
  team: RatedTeam
  dateKey: string
}

function playedKey(): string {
  return `${STORAGE_PLAYED_PREFIX}:nfl`
}

function historyKey(): string {
  return `${STORAGE_HISTORY_PREFIX}:nfl`
}

function stateKey(dateKey: string): string {
  return `${STORAGE_STATE_PREFIX}:nfl:${dateKey}`
}

export function getNflRatedDailyPuzzle(date?: Date): NflRatedPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  const team = minHashPick(NFL_TEAMS, t => t.id, `nfl-rated:nfl:${dateKey}`)
  return { team, dateKey }
}

export function getNflRatedPuzzleByDateKey(dateKey: string): NflRatedPuzzle {
  const team = minHashPick(NFL_TEAMS, t => t.id, `nfl-rated:nfl:${dateKey}`)
  return { team, dateKey }
}

export function getNflRatedArcadePuzzle(excludeId?: string): NflRatedPuzzle {
  const pool = NFL_TEAMS.filter(t => t.id !== excludeId)
  const team = pool[Math.floor(Math.random() * pool.length)] ?? NFL_TEAMS[0]
  return { team, dateKey: "arcade" }
}

export function hasPlayedNflRatedToday(): boolean {
  try {
    return localStorage.getItem(playedKey()) === getTodayKey()
  } catch {
    return false
  }
}

export function markNflRatedPlayed() {
  try {
    localStorage.setItem(playedKey(), getTodayKey())
  } catch {
    // ignore
  }
}

export interface NflRatedGuessRecord {
  teamId: string
  teamName: string
}

export function loadNflRatedDailyGuesses(dateKey: string): NflRatedGuessRecord[] {
  try {
    const raw = localStorage.getItem(stateKey(dateKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveNflRatedDailyGuesses(dateKey: string, guesses: NflRatedGuessRecord[]) {
  try {
    localStorage.setItem(stateKey(dateKey), JSON.stringify(guesses))
  } catch {
    // ignore
  }
}

export interface NflRatedResult {
  date: string
  won: boolean
  guesses: number
  archive?: boolean
}

export function getNflRatedHistory(): NflRatedResult[] {
  try {
    const raw = localStorage.getItem(historyKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveNflRatedResult(date: string, won: boolean, guesses: number) {
  try {
    const archive = date !== getTodayKey()
    const history = getNflRatedHistory()
    const idx = history.findIndex(r => r.date === date)
    const result: NflRatedResult = { date, won, guesses, archive: archive || undefined }
    if (idx >= 0) history[idx] = result
    else history.push(result)
    localStorage.setItem(historyKey(), JSON.stringify(history))
  } catch {
    // ignore
  }
}

export interface NflRatedStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

export function calculateRatedStats(): NflRatedStats {
  const history = getNflRatedHistory()
  if (history.length === 0) {
    return {
      played: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
      losses: 0,
    }
  }
  const played = history.length
  const wins = history.filter(r => r.won).length
  const losses = played - wins
  const winPercentage = Math.round((wins / played) * 100)
  const guessDistribution: Record<number, number> = {}
  for (let i = 1; i <= NFL_RATED_MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= NFL_RATED_MAX_GUESSES) {
      guessDistribution[r.guesses] += 1
    }
  }
  const sorted = history
    .filter(r => !r.archive)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i]
    const d = new Date(r.date)
    d.setHours(0, 0, 0, 0)
    if (r.won) {
      tempStreak++
      if (tempStreak > maxStreak) maxStreak = tempStreak
      const daysDiff = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
      if (i === sorted.length - 1 && (daysDiff === 0 || daysDiff === 1)) currentStreak = tempStreak
    } else {
      tempStreak = 0
      if (i === sorted.length - 1) currentStreak = 0
    }
  }
  return { played, winPercentage, currentStreak, maxStreak, guessDistribution, losses }
}

export type PositionResult = "correct" | "close-up" | "close-down" | "incorrect-up" | "incorrect-down"

export interface RatedComparison {
  QB: PositionResult
  RB: PositionResult
  WR1: PositionResult
  WR2: PositionResult
  WR3: PositionResult
  TE: PositionResult
}

export function compareTeamToAnswer(guessed: RatedTeam, answer: RatedTeam): RatedComparison {
  const result = {} as RatedComparison
  for (const pos of POSITIONS) {
    const diff = guessed.starters[pos].ovr - answer.starters[pos].ovr
    const abs = Math.abs(diff)
    if (abs <= OVR_MATCH_THRESHOLD) {
      result[pos] = "correct"
    } else if (abs <= OVR_MATCH_THRESHOLD + OVR_CLOSE_MARGIN) {
      result[pos] = diff < 0 ? "close-up" : "close-down"
    } else {
      result[pos] = diff < 0 ? "incorrect-up" : "incorrect-down"
    }
  }
  return result
}

// ---- Grouped comparison (QB | RB | TE | WR avg | OL avg) ----

export const COMPARISON_POSITIONS = ["QB", "RB", "TE", "WR", "OL"] as const
export type ComparisonPosition = (typeof COMPARISON_POSITIONS)[number]

export function getGroupedOvr(team: RatedTeam, pos: ComparisonPosition): number {
  if (pos === "QB") return team.starters.QB.ovr
  if (pos === "RB") return team.starters.RB.ovr
  if (pos === "TE") return team.starters.TE.ovr
  if (pos === "WR") {
    const { WR1, WR2, WR3 } = team.starters
    return Math.round((WR1.ovr + WR2.ovr + WR3.ovr) / 3)
  }
  // OL: average of available OL starters
  const olMap = team.starters as Record<OlPosition, RatedStarter | undefined>
  const ovrs = OL_POSITIONS.map(p => olMap[p]?.ovr ?? 0).filter(v => v > 0)
  return ovrs.length > 0 ? Math.round(ovrs.reduce((a, b) => a + b, 0) / ovrs.length) : 0
}

export interface GroupedComparison {
  QB: PositionResult
  RB: PositionResult
  TE: PositionResult
  WR: PositionResult
  OL: PositionResult
}

export function compareGroupedToAnswer(guessed: RatedTeam, answer: RatedTeam): GroupedComparison {
  const result = {} as GroupedComparison
  for (const pos of COMPARISON_POSITIONS) {
    const diff = getGroupedOvr(guessed, pos) - getGroupedOvr(answer, pos)
    const abs = Math.abs(diff)
    if (abs <= OVR_MATCH_THRESHOLD) {
      result[pos] = "correct"
    } else if (abs <= OVR_MATCH_THRESHOLD + OVR_CLOSE_MARGIN) {
      result[pos] = diff < 0 ? "close-up" : "close-down"
    } else {
      result[pos] = diff < 0 ? "incorrect-up" : "incorrect-down"
    }
  }
  return result
}
