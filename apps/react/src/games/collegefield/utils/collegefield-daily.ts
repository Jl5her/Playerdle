import nflData from "@playerdle/data/collegecourt/nfl-college-field.json"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

export type Position = "QB" | "RB" | "TE" | "WR1" | "WR2" | "WR3"
export const POSITIONS: Position[] = ["QB", "RB", "TE", "WR1", "WR2", "WR3"]

export interface CollegeStarter {
  name: string
  school: string
  schoolAbbr: string
  colors: [string, string]
}

export interface CollegeFieldTeam {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  starters: Record<Position, CollegeStarter>
}

const NFL_TEAMS: CollegeFieldTeam[] = nflData.teams as unknown as CollegeFieldTeam[]

export function getCollegeFieldTeams(): CollegeFieldTeam[] {
  return NFL_TEAMS
}

export function getCollegeFieldTeamById(id: string): CollegeFieldTeam | undefined {
  return NFL_TEAMS.find(t => t.id === id)
}

export const COLLEGEFIELD_EPOCH = "2025-09-01"
export const COLLEGEFIELD_MAX_GUESSES = 5

const STORAGE_STATE_PREFIX = "playerdle-collegefield-state"
const STORAGE_HISTORY_PREFIX = "playerdle-collegefield-history:v1"
const STORAGE_PLAYED_PREFIX = "playerdle-collegefield-played-day"

export interface CollegeFieldPuzzle {
  team: CollegeFieldTeam
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

export function getCollegeFieldDailyPuzzle(date?: Date): CollegeFieldPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  const team = minHashPick(NFL_TEAMS, t => t.id, `collegefield:nfl:${dateKey}`)
  return { team, dateKey }
}

export function getCollegeFieldPuzzleByDateKey(dateKey: string): CollegeFieldPuzzle {
  const team = minHashPick(NFL_TEAMS, t => t.id, `collegefield:nfl:${dateKey}`)
  return { team, dateKey }
}

export function getCollegeFieldArcadePuzzle(excludeId?: string): CollegeFieldPuzzle {
  const pool = NFL_TEAMS.filter(t => t.id !== excludeId)
  const team = pool[Math.floor(Math.random() * pool.length)] ?? NFL_TEAMS[0]
  return { team, dateKey: "arcade" }
}

export function hasPlayedCollegeFieldToday(): boolean {
  try {
    return localStorage.getItem(playedKey()) === getTodayKey()
  } catch {
    return false
  }
}

export function markCollegeFieldPlayed() {
  try {
    localStorage.setItem(playedKey(), getTodayKey())
  } catch {
    // ignore
  }
}

export interface CollegeFieldGuessRecord {
  teamId: string
  teamName: string
}

export function loadCollegeFieldDailyGuesses(dateKey: string): CollegeFieldGuessRecord[] {
  try {
    const raw = localStorage.getItem(stateKey(dateKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollegeFieldDailyGuesses(dateKey: string, guesses: CollegeFieldGuessRecord[]) {
  try {
    localStorage.setItem(stateKey(dateKey), JSON.stringify(guesses))
  } catch {
    // ignore
  }
}

export interface CollegeFieldResult {
  date: string
  won: boolean
  guesses: number
  archive?: boolean
}

export function getCollegeFieldHistory(): CollegeFieldResult[] {
  try {
    const raw = localStorage.getItem(historyKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollegeFieldResult(date: string, won: boolean, guesses: number) {
  try {
    const archive = date !== getTodayKey()
    const history = getCollegeFieldHistory()
    const idx = history.findIndex(r => r.date === date)
    const result: CollegeFieldResult = { date, won, guesses, archive: archive || undefined }
    if (idx >= 0) history[idx] = result
    else history.push(result)
    localStorage.setItem(historyKey(), JSON.stringify(history))
  } catch {
    // ignore
  }
}

export interface CollegeFieldStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

export function calculateCollegeFieldStats(): CollegeFieldStats {
  const history = getCollegeFieldHistory()
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
  for (let i = 1; i <= COLLEGEFIELD_MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= COLLEGEFIELD_MAX_GUESSES) {
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

export type PositionResult = "correct" | "incorrect"

export interface CollegeFieldComparison {
  QB: PositionResult
  RB: PositionResult
  TE: PositionResult
  WR1: PositionResult
  WR2: PositionResult
  WR3: PositionResult
}

export function compareTeamToAnswer(
  guessed: CollegeFieldTeam,
  answer: CollegeFieldTeam,
): CollegeFieldComparison {
  const result = {} as CollegeFieldComparison
  for (const pos of POSITIONS) {
    result[pos] =
      guessed.starters[pos].schoolAbbr === answer.starters[pos].schoolAbbr ? "correct" : "incorrect"
  }
  return result
}
