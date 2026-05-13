import { COLLEGIATE_STATES } from "@playerdle/data/statehue/collegiate-states"
import { COLORS_STATES, type ColorsState, type ColorsTeam } from "@playerdle/data/statehue/states"
import { hashString, minHashPickN } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

const TEAMS_PER_PUZZLE = 3

export type ColorsVariant = "pro" | "collegiate"

function datasetFor(variant: ColorsVariant): ColorsState[] {
  return variant === "collegiate" ? COLLEGIATE_STATES : COLORS_STATES
}

function variantSeedSuffix(variant: ColorsVariant): string {
  return variant === "collegiate" ? ":collegiate" : ""
}

interface StateReplica {
  state: ColorsState
  key: string
}

const REPLICA_CACHE = new Map<ColorsVariant, StateReplica[]>()

function getReplicas(variant: ColorsVariant): StateReplica[] {
  const cached = REPLICA_CACHE.get(variant)
  if (cached) return cached
  const replicas = datasetFor(variant).flatMap(state =>
    state.teams.map((_, r) => ({ state, key: `${state.id}:${r}` })),
  )
  REPLICA_CACHE.set(variant, replicas)
  return replicas
}

function rankStatesByHash(dateKey: string, variant: ColorsVariant): ColorsState[] {
  const seed = variantSeedSuffix(variant)
  const scored = getReplicas(variant)
    .map(r => ({
      state: r.state,
      key: r.key,
      hash: hashString(`colors-state${seed}:${dateKey}:${r.key}`),
    }))
    .sort((a, b) => (a.hash !== b.hash ? a.hash - b.hash : a.key < b.key ? -1 : 1))
  const seen = new Set<string>()
  const order: ColorsState[] = []
  for (const s of scored) {
    if (seen.has(s.state.id)) continue
    seen.add(s.state.id)
    order.push(s.state)
  }
  return order
}

function pickTeamsForState(
  state: ColorsState,
  dateKey: string,
  variant: ColorsVariant,
): ColorsTeam[] {
  const seed = variantSeedSuffix(variant)
  return minHashPickN(
    state.teams,
    t => t.name,
    `colors-teams${seed}:${dateKey}:${state.id}`,
    TEAMS_PER_PUZZLE,
  )
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

const STATE_FOR_DATE_CACHE = new Map<string, ColorsState>()

function pickWeightedStateForDate(dateKey: string, variant: ColorsVariant): ColorsState {
  const cacheKey = `${variant}:${dateKey}`
  const cached = STATE_FOR_DATE_CACHE.get(cacheKey)
  if (cached) return cached

  const ranked = rankStatesByHash(dateKey, variant)
  let result = ranked[0]
  const yesterday = previousDateKey(dateKey)
  if (yesterday && yesterday >= COLORS_EPOCH_DATE_KEY) {
    const yesterdayActual = pickWeightedStateForDate(yesterday, variant)
    if (result.id === yesterdayActual.id) {
      const alt = ranked.find(s => s.id !== yesterdayActual.id)
      if (alt) result = alt
    }
  }

  STATE_FOR_DATE_CACHE.set(cacheKey, result)
  return result
}

function pickWeightedStateRandom(
  variant: ColorsVariant,
  excludeStateId?: string,
): ColorsState {
  const all = datasetFor(variant)
  const pool = excludeStateId ? all.filter(s => s.id !== excludeStateId) : all
  const totalWeight = pool.reduce((sum, s) => sum + s.teams.length, 0)
  let target = Math.random() * totalWeight
  for (const state of pool) {
    if (target < state.teams.length) return state
    target -= state.teams.length
  }
  return pool[0] ?? all[0]
}

export interface ColorsPuzzle {
  state: ColorsState
  teams: ColorsTeam[]
  dateKey: string
  index: number
  variant: ColorsVariant
}

export const COLORS_EPOCH_DATE_KEY = "2025-01-01"

function daysSinceEpoch(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  const target = Date.UTC(year, month - 1, day)
  const [ey, em, ed] = COLORS_EPOCH_DATE_KEY.split("-").map(Number)
  const epoch = Date.UTC(ey, em - 1, ed)
  return Math.floor((target - epoch) / 86_400_000)
}

export function getDailyColorsPuzzle(
  date?: Date,
  variant: ColorsVariant = "pro",
): ColorsPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  return getColorsPuzzleByDateKey(dateKey, variant)
}

export function getColorsPuzzleByDateKey(
  dateKey: string,
  variant: ColorsVariant = "pro",
): ColorsPuzzle {
  const state = pickWeightedStateForDate(dateKey, variant)
  return {
    state,
    teams: pickTeamsForState(state, dateKey, variant),
    dateKey,
    index: daysSinceEpoch(dateKey) + 1,
    variant,
  }
}

export function getArcadeColorsPuzzle(
  excludeStateId?: string,
  variant: ColorsVariant = "pro",
): ColorsPuzzle {
  const state = pickWeightedStateRandom(variant, excludeStateId)
  const arcadeSeed = `arcade:${Math.random().toString(36).slice(2)}`
  return {
    state,
    teams: pickTeamsForState(state, arcadeSeed, variant),
    dateKey: "arcade",
    index: 0,
    variant,
  }
}

function playedKey(variant: ColorsVariant): string {
  return variant === "collegiate"
    ? "playerdle-colors-collegiate-played-day"
    : "playerdle-colors-played-day"
}

function historyKey(variant: ColorsVariant): string {
  return variant === "collegiate"
    ? "playerdle-colors-collegiate-history:v1"
    : "playerdle-colors-history:v1"
}

export function markColorsDailyPlayed(variant: ColorsVariant = "pro") {
  localStorage.setItem(playedKey(variant), getTodayKey())
}

export function hasPlayedColorsDailyToday(variant: ColorsVariant = "pro"): boolean {
  return localStorage.getItem(playedKey(variant)) === getTodayKey()
}

export interface ColorsResult {
  date: string
  won: boolean
  guesses: number
}

export function getColorsHistory(variant: ColorsVariant = "pro"): ColorsResult[] {
  try {
    const raw = localStorage.getItem(historyKey(variant))
    if (!raw) return []
    return JSON.parse(raw) as ColorsResult[]
  } catch {
    return []
  }
}

export function saveColorsResult(
  date: string,
  won: boolean,
  guesses: number,
  variant: ColorsVariant = "pro",
) {
  const history = getColorsHistory(variant)
  const idx = history.findIndex(r => r.date === date)
  const result: ColorsResult = { date, won, guesses }
  if (idx >= 0) history[idx] = result
  else history.push(result)
  localStorage.setItem(historyKey(variant), JSON.stringify(history))
}

export function getColorsResultForDate(
  date: string,
  variant: ColorsVariant = "pro",
): ColorsResult | undefined {
  return getColorsHistory(variant).find(r => r.date === date)
}

export interface ColorsStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}

const MAX_COLORS_GUESSES = 5

export function calculateColorsStats(variant: ColorsVariant = "pro"): ColorsStats {
  const history = getColorsHistory(variant)
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
