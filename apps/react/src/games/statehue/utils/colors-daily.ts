import { COLORS_STATES, type ColorsState, type ColorsTeam } from "@playerdle/data/statehue/states"
import { hashString, minHashPickN } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

const TEAMS_PER_PUZZLE = 3

// Weighted virtual replicas: each state contributes `teams.length` entries so
// states with more teams remain more likely to win the daily — matching the
// previous `seed % totalWeight` behavior, but order-independent.
interface StateReplica {
  state: ColorsState
  key: string
}
const STATE_REPLICAS: StateReplica[] = COLORS_STATES.flatMap(state =>
  state.teams.map((_, r) => ({ state, key: `${state.id}:${r}` })),
)

function rankStatesByHash(dateKey: string): ColorsState[] {
  const scored = STATE_REPLICAS.map(r => ({
    state: r.state,
    key: r.key,
    hash: hashString(`colors-state:${dateKey}:${r.key}`),
  })).sort((a, b) => (a.hash !== b.hash ? a.hash - b.hash : a.key < b.key ? -1 : 1))
  const seen = new Set<string>()
  const order: ColorsState[] = []
  for (const s of scored) {
    if (seen.has(s.state.id)) continue
    seen.add(s.state.id)
    order.push(s.state)
  }
  return order
}

function pickTeamsForState(state: ColorsState, dateKey: string): ColorsTeam[] {
  return minHashPickN(state.teams, t => t.name, `colors-teams:${dateKey}:${state.id}`, TEAMS_PER_PUZZLE)
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

  const ranked = rankStatesByHash(dateKey)
  let result = ranked[0]
  const yesterday = previousDateKey(dateKey)
  if (yesterday && yesterday >= COLORS_EPOCH_DATE_KEY) {
    const yesterdayActual = pickWeightedStateForDate(yesterday)
    if (result.id === yesterdayActual.id) {
      const alt = ranked.find(s => s.id !== yesterdayActual.id)
      if (alt) result = alt
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
  const dateKey = date ? getDateKey(date) : getTodayKey()
  return getColorsPuzzleByDateKey(dateKey)
}

export function getColorsPuzzleByDateKey(dateKey: string): ColorsPuzzle {
  const state = pickWeightedStateForDate(dateKey)
  return {
    state,
    teams: pickTeamsForState(state, dateKey),
    dateKey,
    index: daysSinceEpoch(dateKey) + 1,
  }
}

export function getArcadeColorsPuzzle(excludeStateId?: string): ColorsPuzzle {
  const state = pickWeightedStateRandom(excludeStateId)
  // Arcade randomization: use a random non-date "seed" so successive arcade
  // puzzles vary even within the same state.
  const arcadeSeed = `arcade:${Math.random().toString(36).slice(2)}`
  return { state, teams: pickTeamsForState(state, arcadeSeed), dateKey: "arcade", index: 0 }
}


const COLORS_PLAYED_KEY = "playerdle-colors-played-day"
const COLORS_HISTORY_KEY = "playerdle-colors-history:v1"

export function markColorsDailyPlayed() {
  localStorage.setItem(COLORS_PLAYED_KEY, getTodayKey())
}

export function hasPlayedColorsDailyToday(): boolean {
  return localStorage.getItem(COLORS_PLAYED_KEY) === getTodayKey()
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
