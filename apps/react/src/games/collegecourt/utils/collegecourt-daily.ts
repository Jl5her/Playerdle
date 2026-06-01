import nbaData from "@playerdle/data/collegecourt/nba-college-court.json"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

export type CollegeCourtLeague = "nba"

export type Position = "PG" | "SG" | "SF" | "PF" | "C"
export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"]

export interface CollegeStarter {
  name: string
  school: string
  schoolAbbr: string
  colors: [string, string]
}

export interface CollegeCourtTeam {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  starters: Record<Position, CollegeStarter>
}

const NBA_TEAMS: CollegeCourtTeam[] = nbaData.teams as unknown as CollegeCourtTeam[]

export function getCollegeCourtTeams(): CollegeCourtTeam[] {
  return NBA_TEAMS
}

export function getCollegeCourtTeamById(id: string): CollegeCourtTeam | undefined {
  return NBA_TEAMS.find(t => t.id === id)
}

export const COLLEGECOURT_EPOCH = "2025-06-01"
export const COLLEGECOURT_MAX_GUESSES = 5

const STORAGE_STATE_PREFIX = "playerdle-collegecourt-state"
const STORAGE_HISTORY_PREFIX = "playerdle-collegecourt-history:v1"
const STORAGE_PLAYED_PREFIX = "playerdle-collegecourt-played-day"

export interface CollegeCourtPuzzle {
  team: CollegeCourtTeam
  dateKey: string
}

function playedKey(): string {
  return `${STORAGE_PLAYED_PREFIX}:nba`
}

function historyKey(): string {
  return `${STORAGE_HISTORY_PREFIX}:nba`
}

function stateKey(dateKey: string): string {
  return `${STORAGE_STATE_PREFIX}:nba:${dateKey}`
}

export function getCollegeCourtDailyPuzzle(date?: Date): CollegeCourtPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  const team = minHashPick(NBA_TEAMS, t => t.id, `collegecourt:nba:${dateKey}`)
  return { team, dateKey }
}

export function getCollegeCourtPuzzleByDateKey(dateKey: string): CollegeCourtPuzzle {
  const team = minHashPick(NBA_TEAMS, t => t.id, `collegecourt:nba:${dateKey}`)
  return { team, dateKey }
}

export function getCollegeCourtArcadePuzzle(excludeId?: string): CollegeCourtPuzzle {
  const pool = NBA_TEAMS.filter(t => t.id !== excludeId)
  const team = pool[Math.floor(Math.random() * pool.length)] ?? NBA_TEAMS[0]
  return { team, dateKey: "arcade" }
}

export function hasPlayedCollegeCourtToday(): boolean {
  try {
    return localStorage.getItem(playedKey()) === getTodayKey()
  } catch {
    return false
  }
}

export function markCollegeCourtPlayed() {
  try {
    localStorage.setItem(playedKey(), getTodayKey())
  } catch {
    // ignore
  }
}

export interface CollegeCourtGuessRecord {
  teamId: string
  teamName: string
}

export function loadCollegeCourtDailyGuesses(dateKey: string): CollegeCourtGuessRecord[] {
  try {
    const raw = localStorage.getItem(stateKey(dateKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollegeCourtDailyGuesses(dateKey: string, guesses: CollegeCourtGuessRecord[]) {
  try {
    localStorage.setItem(stateKey(dateKey), JSON.stringify(guesses))
  } catch {
    // ignore
  }
}

export interface CollegeCourtResult {
  date: string
  won: boolean
  guesses: number
  archive?: boolean
}

export function getCollegeCourtHistory(): CollegeCourtResult[] {
  try {
    const raw = localStorage.getItem(historyKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollegeCourtResult(date: string, won: boolean, guesses: number) {
  try {
    const archive = date !== getTodayKey()
    const history = getCollegeCourtHistory()
    const idx = history.findIndex(r => r.date === date)
    const result: CollegeCourtResult = { date, won, guesses, archive: archive || undefined }
    if (idx >= 0) history[idx] = result
    else history.push(result)
    localStorage.setItem(historyKey(), JSON.stringify(history))
  } catch {
    // ignore
  }
}

export interface CollegeCourtStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

export function calculateCollegeCourtStats(): CollegeCourtStats {
  const history = getCollegeCourtHistory()
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
  for (let i = 1; i <= COLLEGECOURT_MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= COLLEGECOURT_MAX_GUESSES) {
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

export interface CollegeCourtComparison {
  PG: PositionResult
  SG: PositionResult
  SF: PositionResult
  PF: PositionResult
  C: PositionResult
}

export function compareTeamToAnswer(
  guessed: CollegeCourtTeam,
  answer: CollegeCourtTeam,
): CollegeCourtComparison {
  const result = {} as CollegeCourtComparison
  for (const pos of POSITIONS) {
    result[pos] =
      guessed.starters[pos].schoolAbbr === answer.starters[pos].schoolAbbr ? "correct" : "incorrect"
  }
  return result
}
