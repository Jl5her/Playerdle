import nbaData from "@playerdle/data/rated/nba-rated.json"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

export const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const
export type Position = (typeof POSITIONS)[number]

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
  starters: Record<Position, RatedStarter>
}

const NBA_TEAMS: RatedTeam[] = nbaData.teams as unknown as RatedTeam[]

export function getNbaRatedTeams(): RatedTeam[] {
  return NBA_TEAMS
}

export function getNbaRatedTeamById(id: string): RatedTeam | undefined {
  return NBA_TEAMS.find(t => t.id === id)
}

export const NBA_RATED_EPOCH = "2025-10-01"
export const NBA_RATED_MAX_GUESSES = 5
export const OVR_MATCH_THRESHOLD = 7
export const OVR_CLOSE_MARGIN = 3

const STORAGE_STATE_PREFIX = "playerdle-nba-rated-state"
const STORAGE_HISTORY_PREFIX = "playerdle-nba-rated-history:v1"
const STORAGE_PLAYED_PREFIX = "playerdle-nba-rated-played-day"

export interface NbaRatedPuzzle {
  team: RatedTeam
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

export function getNbaRatedDailyPuzzle(date?: Date): NbaRatedPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  const team = minHashPick(NBA_TEAMS, t => t.id, `nba-rated:nba:${dateKey}`)
  return { team, dateKey }
}

export function getNbaRatedPuzzleByDateKey(dateKey: string): NbaRatedPuzzle {
  const team = minHashPick(NBA_TEAMS, t => t.id, `nba-rated:nba:${dateKey}`)
  return { team, dateKey }
}

export function getNbaRatedArcadePuzzle(excludeId?: string): NbaRatedPuzzle {
  const pool = NBA_TEAMS.filter(t => t.id !== excludeId)
  const team = pool[Math.floor(Math.random() * pool.length)] ?? NBA_TEAMS[0]
  return { team, dateKey: "arcade" }
}

export function hasPlayedNbaRatedToday(): boolean {
  try {
    return localStorage.getItem(playedKey()) === getTodayKey()
  } catch {
    return false
  }
}

export function markNbaRatedPlayed() {
  try {
    localStorage.setItem(playedKey(), getTodayKey())
  } catch {
    // ignore
  }
}

export interface NbaRatedGuessRecord {
  teamId: string
  teamName: string
}

export function loadNbaRatedDailyGuesses(dateKey: string): NbaRatedGuessRecord[] {
  try {
    const raw = localStorage.getItem(stateKey(dateKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveNbaRatedDailyGuesses(dateKey: string, guesses: NbaRatedGuessRecord[]) {
  try {
    localStorage.setItem(stateKey(dateKey), JSON.stringify(guesses))
  } catch {
    // ignore
  }
}

export interface NbaRatedResult {
  date: string
  won: boolean
  guesses: number
  archive?: boolean
}

export function getNbaRatedHistory(): NbaRatedResult[] {
  try {
    const raw = localStorage.getItem(historyKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveNbaRatedResult(date: string, won: boolean, guesses: number) {
  try {
    const archive = date !== getTodayKey()
    const history = getNbaRatedHistory()
    const idx = history.findIndex(r => r.date === date)
    const result: NbaRatedResult = { date, won, guesses, archive: archive || undefined }
    if (idx >= 0) history[idx] = result
    else history.push(result)
    localStorage.setItem(historyKey(), JSON.stringify(history))
  } catch {
    // ignore
  }
}

export interface NbaRatedStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

export function calculateRatedStats(): NbaRatedStats {
  const history = getNbaRatedHistory()
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
  for (let i = 1; i <= NBA_RATED_MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= NBA_RATED_MAX_GUESSES) {
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
  PG: PositionResult
  SG: PositionResult
  SF: PositionResult
  PF: PositionResult
  C: PositionResult
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
