import {
  STADIUM_STATES,
  type StadiumEntry,
  type StadiumState,
} from "@playerdle/data/statehue/stadium-states"
import { hashString, minHashPickN } from "@/shared/utils/daily-select"
import { getDateKey, getTodayKey } from "@/shared/utils/time"

const STADIUMS_PER_PUZZLE = 3

export const STADIUM_EPOCH_DATE_KEY = "2026-06-06"

interface StateReplica {
  state: StadiumState
  key: string
}

const REPLICA_CACHE: StateReplica[] = []

function getReplicas(): StateReplica[] {
  if (REPLICA_CACHE.length > 0) return REPLICA_CACHE
  const replicas = STADIUM_STATES.flatMap(state =>
    state.stadiums.map((_, r) => ({ state, key: `${state.id}:${r}` })),
  )
  REPLICA_CACHE.push(...replicas)
  return REPLICA_CACHE
}

function rankStatesByHash(dateKey: string): StadiumState[] {
  const scored = getReplicas()
    .map(r => ({
      state: r.state,
      key: r.key,
      hash: hashString(`stadium-state:${dateKey}:${r.key}`),
    }))
    .sort((a, b) => (a.hash !== b.hash ? a.hash - b.hash : a.key < b.key ? -1 : 1))
  const seen = new Set<string>()
  const order: StadiumState[] = []
  for (const s of scored) {
    if (seen.has(s.state.id)) continue
    seen.add(s.state.id)
    order.push(s.state)
  }
  return order
}

function pickStadiumsForState(state: StadiumState, dateKey: string): StadiumEntry[] {
  return minHashPickN(
    state.stadiums,
    s => s.name,
    `stadium-picks:${dateKey}:${state.id}`,
    STADIUMS_PER_PUZZLE,
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

const STATE_FOR_DATE_CACHE = new Map<string, StadiumState>()

function pickStateForDate(dateKey: string): StadiumState {
  const cached = STATE_FOR_DATE_CACHE.get(dateKey)
  if (cached) return cached

  const chain: string[] = []
  let cursor = dateKey
  while (!STATE_FOR_DATE_CACHE.has(cursor)) {
    chain.push(cursor)
    const prev = previousDateKey(cursor)
    if (!prev || prev < STADIUM_EPOCH_DATE_KEY) break
    cursor = prev
  }

  for (let i = chain.length - 1; i >= 0; i--) {
    const dk = chain[i]
    const ranked = rankStatesByHash(dk)
    let result = ranked[0]
    const prev = previousDateKey(dk)
    if (prev && prev >= STADIUM_EPOCH_DATE_KEY) {
      const prevActual = STATE_FOR_DATE_CACHE.get(prev)
      if (prevActual && result.id === prevActual.id) {
        const alt = ranked.find(s => s.id !== prevActual.id)
        if (alt) result = alt
      }
    }
    STATE_FOR_DATE_CACHE.set(dk, result)
  }

  return STATE_FOR_DATE_CACHE.get(dateKey)!
}

function pickStateRandom(excludeStateId?: string): StadiumState {
  const pool = excludeStateId
    ? STADIUM_STATES.filter(s => s.id !== excludeStateId)
    : STADIUM_STATES
  const totalWeight = pool.reduce((sum, s) => sum + s.stadiums.length, 0)
  let target = Math.random() * totalWeight
  for (const state of pool) {
    if (target < state.stadiums.length) return state
    target -= state.stadiums.length
  }
  return pool[0] ?? STADIUM_STATES[0]
}

export interface StadiumPuzzle {
  state: StadiumState
  stadiums: StadiumEntry[]
  dateKey: string
  index: number
}

function daysSinceEpoch(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number)
  const target = Date.UTC(year, month - 1, day)
  const [ey, em, ed] = STADIUM_EPOCH_DATE_KEY.split("-").map(Number)
  const epoch = Date.UTC(ey, em - 1, ed)
  return Math.floor((target - epoch) / 86_400_000)
}

export function getDailyStadiumPuzzle(date?: Date): StadiumPuzzle {
  const dateKey = date ? getDateKey(date) : getTodayKey()
  return getStadiumPuzzleByDateKey(dateKey)
}

export function getStadiumPuzzleByDateKey(dateKey: string): StadiumPuzzle {
  const state = pickStateForDate(dateKey)
  return {
    state,
    stadiums: pickStadiumsForState(state, dateKey),
    dateKey,
    index: daysSinceEpoch(dateKey) + 1,
  }
}

export function getArcadeStadiumPuzzle(excludeStateId?: string): StadiumPuzzle {
  const state = pickStateRandom(excludeStateId)
  const arcadeSeed = `arcade:${Math.random().toString(36).slice(2)}`
  return {
    state,
    stadiums: pickStadiumsForState(state, arcadeSeed),
    dateKey: "arcade",
    index: 0,
  }
}

function loadGuesses(dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(`playerdle-stadium-state:v1:${dateKey}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveGuesses(dateKey: string, guesses: string[]) {
  localStorage.setItem(`playerdle-stadium-state:v1:${dateKey}`, JSON.stringify(guesses))
}

export function loadDailyStadiumGuesses(dateKey: string): string[] {
  return loadGuesses(dateKey)
}

export function saveDailyStadiumGuesses(dateKey: string, guesses: string[]) {
  saveGuesses(dateKey, guesses)
}

export function markStadiumDailyPlayed() {
  localStorage.setItem("playerdle-stadium-played-day", getTodayKey())
}

export function hasPlayedStadiumDailyToday(): boolean {
  return localStorage.getItem("playerdle-stadium-played-day") === getTodayKey()
}

export interface StadiumResult {
  date: string
  won: boolean
  guesses: number
  guessIds?: string[]
  archive?: boolean
}

const HISTORY_KEY = "playerdle-stadium-history:v1"

export function getStadiumHistory(): StadiumResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StadiumResult[]) : []
  } catch {
    return []
  }
}

export function saveStadiumResult(
  date: string,
  won: boolean,
  guesses: number,
  guessIds?: string[],
) {
  const archive = date !== getTodayKey()
  const history = getStadiumHistory()
  const idx = history.findIndex(r => r.date === date)
  const existing = idx >= 0 ? history[idx] : undefined
  const result: StadiumResult = {
    date,
    won,
    guesses,
    guessIds: guessIds ?? existing?.guessIds,
    archive: archive || existing?.archive,
  }
  if (idx >= 0) history[idx] = result
  else history.push(result)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function getStadiumResultForDate(date: string): StadiumResult | undefined {
  return getStadiumHistory().find(r => r.date === date)
}

export interface StadiumStats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
  losses: number
}

const MAX_GUESSES = 5

export function calculateStadiumStats(): StadiumStats {
  const history = getStadiumHistory()
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

  return { played, winPercentage, currentStreak, maxStreak, guessDistribution, losses }
}
