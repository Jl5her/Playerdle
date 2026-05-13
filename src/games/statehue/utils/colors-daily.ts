import { COLORS_STATES, type ColorsState, type ColorsTeam } from "@/games/statehue/data/states"
import { getTodayKeyInEasternTime } from "@/shared/utils/time"

const TEAMS_PER_PUZZLE = 3

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return mix32(hash >>> 0)
}

// MurmurHash3 fmix32 finalizer — gives the avalanche effect that the
// polynomial hash above lacks. Without this, sequential date strings cluster
// into the same modulo buckets and some states never get picked.
function mix32(h: number): number {
  let x = h >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x85ebca6b) >>> 0
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35) >>> 0
  x ^= x >>> 16
  return x >>> 0
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items]
  let state = seed || 1
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pickTeamsForState(state: ColorsState, seed: number): ColorsTeam[] {
  return seededShuffle(state.teams, seed).slice(0, TEAMS_PER_PUZZLE)
}

function pickWeightedState(seed: number): ColorsState {
  const totalWeight = COLORS_STATES.reduce((sum, s) => sum + s.teams.length, 0)
  let target = seed % totalWeight
  for (const state of COLORS_STATES) {
    if (target < state.teams.length) return state
    target -= state.teams.length
  }
  return COLORS_STATES[0]
}

function previousDateKey(dateKey: string): string | undefined {
  const [y, m, d] = dateKey.split("-").map(Number)
  if (!y || !m || !d) return undefined
  const t = Date.UTC(y, m - 1, d) - 86_400_000
  const date = new Date(t)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

const stateForDateCache = new Map<string, ColorsState>()

function pickWeightedStateForDate(dateKey: string): ColorsState {
  const cached = stateForDateCache.get(dateKey)
  if (cached) return cached

  const primary = pickWeightedState(hashString(`colors-state:${dateKey}`))
  const yesterday = previousDateKey(dateKey)
  let result = primary
  if (yesterday && yesterday >= COLORS_EPOCH_DATE_KEY) {
    const yesterdayActual = pickWeightedStateForDate(yesterday)
    if (primary.id === yesterdayActual.id) {
      for (let r = 1; r <= 5; r++) {
        const alt = pickWeightedState(hashString(`colors-state:${dateKey}:r${r}`))
        if (alt.id !== yesterdayActual.id) {
          result = alt
          break
        }
      }
    }
  }

  stateForDateCache.set(dateKey, result)
  return result
}

function pickWeightedStateRandom(excludeStateId?: string): ColorsState {
  const pool = excludeStateId
    ? COLORS_STATES.filter(s => s.id !== excludeStateId)
    : COLORS_STATES
  const totalWeight = pool.reduce((sum, s) => sum + s.teams.length, 0)
  let target = Math.random() * totalWeight
  for (const state of pool) {
    if (target < state.teams.length) return state
    target -= state.teams.length
  }
  return pool[0] ?? COLORS_STATES[0]
}

export interface ColorsPuzzle {
  state: ColorsState
  teams: ColorsTeam[]
  dateKey: string
  index: number
}

export const COLORS_EPOCH_DATE_KEY = "2025-01-01"

function daysSinceEpoch(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  const target = Date.UTC(year, month - 1, day)
  const [ey, em, ed] = COLORS_EPOCH_DATE_KEY.split("-").map(Number)
  const epoch = Date.UTC(ey, em - 1, ed)
  return Math.floor((target - epoch) / 86_400_000)
}

export function getDailyColorsPuzzle(date?: Date): ColorsPuzzle {
  const dateKey = date ? formatDate(date) : getTodayKeyInEasternTime()
  return getColorsPuzzleByDateKey(dateKey)
}

export function getColorsPuzzleByDateKey(dateKey: string): ColorsPuzzle {
  const state = pickWeightedStateForDate(dateKey)
  const teamHash = hashString(`colors-teams:${dateKey}:${state.id}`)
  return {
    state,
    teams: pickTeamsForState(state, teamHash),
    dateKey,
    index: daysSinceEpoch(dateKey) + 1,
  }
}

export function getArcadeColorsPuzzle(excludeStateId?: string): ColorsPuzzle {
  const state = pickWeightedStateRandom(excludeStateId)
  const seed = Math.floor(Math.random() * 1_000_000_000) + 1
  return { state, teams: pickTeamsForState(state, seed), dateKey: "arcade", index: 0 }
}

function formatDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date)
}

const COLORS_PLAYED_KEY = "playerdle-colors-played-day"
const COLORS_HISTORY_KEY = "playerdle-colors-history:v1"

export function markColorsDailyPlayed() {
  localStorage.setItem(COLORS_PLAYED_KEY, getTodayKeyInEasternTime())
}

export function hasPlayedColorsDailyToday(): boolean {
  return localStorage.getItem(COLORS_PLAYED_KEY) === getTodayKeyInEasternTime()
}

export interface ColorsResult {
  date: string
  won: boolean
  guesses: number
}

export function getColorsHistory(): ColorsResult[] {
  try {
    const raw = localStorage.getItem(COLORS_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ColorsResult[]
  } catch {
    return []
  }
}

export function saveColorsResult(date: string, won: boolean, guesses: number) {
  const history = getColorsHistory()
  const idx = history.findIndex(r => r.date === date)
  const result: ColorsResult = { date, won, guesses }
  if (idx >= 0) history[idx] = result
  else history.push(result)
  localStorage.setItem(COLORS_HISTORY_KEY, JSON.stringify(history))
}

export function getColorsResultForDate(date: string): ColorsResult | undefined {
  return getColorsHistory().find(r => r.date === date)
}

export interface ColorsStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}

const MAX_COLORS_GUESSES = 5

export function calculateColorsStats(): ColorsStats {
  const history = getColorsHistory()
  if (history.length === 0) {
    return { played: 0, winPercentage: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {} }
  }

  const played = history.length
  const wins = history.filter(r => r.won).length
  const winPercentage = Math.round((wins / played) * 100)

  const guessDistribution: Record<number, number> = {}
  for (let i = 1; i <= MAX_COLORS_GUESSES; i++) guessDistribution[i] = 0
  for (const r of history) {
    if (r.won && r.guesses >= 1 && r.guesses <= MAX_COLORS_GUESSES) {
      guessDistribution[r.guesses] += 1
    }
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
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
      tempStreak += 1
      if (tempStreak > maxStreak) maxStreak = tempStreak
      const daysDiff = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
      if (i === sorted.length - 1 && (daysDiff === 0 || daysDiff === 1)) {
        currentStreak = tempStreak
      }
    } else {
      tempStreak = 0
      if (i === sorted.length - 1) currentStreak = 0
    }
  }

  return { played, winPercentage, currentStreak, maxStreak, guessDistribution }
}
