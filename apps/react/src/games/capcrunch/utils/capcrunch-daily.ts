import nflCapCrunchData from "@playerdle/data/capcrunch/nfl-capcrunch.json"
import { minHashPick } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

export interface CapCrunchPlayer {
  name: string
  salary: number
  number?: number
}

export interface CapCrunchOffense {
  QB: CapCrunchPlayer
  RB: CapCrunchPlayer
  TE: CapCrunchPlayer
  WR: [CapCrunchPlayer, CapCrunchPlayer, CapCrunchPlayer]
  OL: [CapCrunchPlayer, CapCrunchPlayer, CapCrunchPlayer, CapCrunchPlayer, CapCrunchPlayer]
}

export interface CapCrunchTeam {
  id: string
  name: string
  abbr: string
  offense: CapCrunchOffense
}

export type CapCrunchLeague = "nfl"

const TEAM_DATA: Record<CapCrunchLeague, CapCrunchTeam[]> = {
  nfl: nflCapCrunchData.teams as unknown as CapCrunchTeam[],
}

export function getCapCrunchTeams(league: CapCrunchLeague): CapCrunchTeam[] {
  return TEAM_DATA[league]
}

export function getCapCrunchTeamById(league: CapCrunchLeague, id: string): CapCrunchTeam | undefined {
  return TEAM_DATA[league].find(t => t.id === id)
}

const CAPCRUNCH_EPOCH = "2025-01-01"
const STORAGE_STATE_PREFIX = "playerdle-capcrunch-state"
const STORAGE_HISTORY_PREFIX = "playerdle-capcrunch-history:v1"
const STORAGE_PLAYED_PREFIX = "playerdle-capcrunch-played-day"

export interface CapCrunchPuzzle {
  team: CapCrunchTeam
  dateKey: string
  league: CapCrunchLeague
}

function playedKey(league: CapCrunchLeague): string {
  return `${STORAGE_PLAYED_PREFIX}:${league}`
}

function historyKey(league: CapCrunchLeague): string {
  return `${STORAGE_HISTORY_PREFIX}:${league}`
}

function stateKey(league: CapCrunchLeague, dateKey: string): string {
  return `${STORAGE_STATE_PREFIX}:${league}:${dateKey}`
}

export function getCapCrunchDailyPuzzle(league: CapCrunchLeague, date?: Date): CapCrunchPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  const teams = getCapCrunchTeams(league)
  const team = minHashPick(teams, t => t.id, `capcrunch:${league}:${dateKey}`)
  return { team, dateKey, league }
}

export function getCapCrunchPuzzleByDateKey(league: CapCrunchLeague, dateKey: string): CapCrunchPuzzle {
  const teams = getCapCrunchTeams(league)
  const team = minHashPick(teams, t => t.id, `capcrunch:${league}:${dateKey}`)
  return { team, dateKey, league }
}

export function getCapCrunchArcadePuzzle(league: CapCrunchLeague, excludeId?: string): CapCrunchPuzzle {
  const teams = getCapCrunchTeams(league).filter(t => t.id !== excludeId)
  const team = teams[Math.floor(Math.random() * teams.length)] ?? getCapCrunchTeams(league)[0]
  return { team, dateKey: "arcade", league }
}

export function hasPlayedCapCrunchToday(league: CapCrunchLeague): boolean {
  try {
    return localStorage.getItem(playedKey(league)) === getTodayKey()
  } catch {
    return false
  }
}

export function markCapCrunchPlayed(league: CapCrunchLeague) {
  try {
    localStorage.setItem(playedKey(league), getTodayKey())
  } catch {
    // ignore
  }
}

export interface CapCrunchGuessRecord {
  teamId: string
  teamName: string
}

export function loadCapCrunchDailyGuesses(league: CapCrunchLeague, dateKey: string): CapCrunchGuessRecord[] {
  try {
    const raw = localStorage.getItem(stateKey(league, dateKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCapCrunchDailyGuesses(
  league: CapCrunchLeague,
  dateKey: string,
  guesses: CapCrunchGuessRecord[],
) {
  try {
    localStorage.setItem(stateKey(league, dateKey), JSON.stringify(guesses))
  } catch {
    // ignore
  }
}

export interface CapCrunchResult {
  date: string
  won: boolean
  guesses: number
  archive?: boolean
}

export function getCapCrunchHistory(league: CapCrunchLeague): CapCrunchResult[] {
  try {
    const raw = localStorage.getItem(historyKey(league))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCapCrunchResult(
  league: CapCrunchLeague,
  date: string,
  won: boolean,
  guesses: number,
) {
  try {
    const archive = date !== getTodayKey()
    const history = getCapCrunchHistory(league)
    const idx = history.findIndex(r => r.date === date)
    const result: CapCrunchResult = { date, won, guesses, archive: archive || undefined }
    if (idx >= 0) history[idx] = result
    else history.push(result)
    localStorage.setItem(historyKey(league), JSON.stringify(history))
  } catch {
    // ignore
  }
}

export interface CapCrunchStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

const MAX_GUESSES = 5

export function calculateCapCrunchStats(league: CapCrunchLeague): CapCrunchStats {
  const history = getCapCrunchHistory(league)
  if (history.length === 0) {
    return { played: 0, winPercentage: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {}, losses: 0 }
  }
  const played = history.length
  const wins = history.filter(r => r.won).length
  const losses = played - wins
  const winPercentage = Math.round((wins / played) * 100)
  const guessDistribution: Record<number, number> = {}
  for (let i = 1; i <= MAX_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= MAX_GUESSES) {
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

// ---- Comparison logic ----

// "close-high" = within threshold, guessed > answer (answer is lower → ↓)
// "close-low"  = within threshold, guessed < answer (answer is higher → ↑)
export type ComparisonResult = "correct" | "close-high" | "close-low" | "high" | "low"

const CLOSE_THRESHOLDS = {
  QB: 5_000_000,
  RB: 2_000_000,
  TE: 2_500_000,
  WR: 7_000_000,
  OL: 10_000_000,
}

function combinedSalary(players: CapCrunchPlayer[]): number {
  return players.reduce((s, p) => s + p.salary, 0)
}

export interface CapCrunchComparison {
  QB: ComparisonResult
  RB: ComparisonResult
  TE: ComparisonResult
  WR: ComparisonResult
  OL: ComparisonResult
}

export function compareTeamToAnswer(guessed: CapCrunchTeam, answer: CapCrunchTeam): CapCrunchComparison {
  function compare(
    guessedVal: number,
    answerVal: number,
    threshold: number,
  ): ComparisonResult {
    const diff = guessedVal - answerVal
    if (Math.abs(diff) <= threshold) return diff >= 0 ? "close-high" : "close-low"
    return diff > 0 ? "high" : "low"
  }

  return {
    QB: compare(guessed.offense.QB.salary, answer.offense.QB.salary, CLOSE_THRESHOLDS.QB),
    RB: compare(guessed.offense.RB.salary, answer.offense.RB.salary, CLOSE_THRESHOLDS.RB),
    TE: compare(guessed.offense.TE.salary, answer.offense.TE.salary, CLOSE_THRESHOLDS.TE),
    WR: compare(
      combinedSalary(guessed.offense.WR),
      combinedSalary(answer.offense.WR),
      CLOSE_THRESHOLDS.WR,
    ),
    OL: compare(
      combinedSalary(guessed.offense.OL),
      combinedSalary(answer.offense.OL),
      CLOSE_THRESHOLDS.OL,
    ),
  }
}

export { CAPCRUNCH_EPOCH }
export { MAX_GUESSES as CAPCRUNCH_MAX_GUESSES }
