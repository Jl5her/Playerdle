import type { GameResult } from "@playerdle/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { calculateStats } from "./stats"

const SPORT = "nfl"
const KEY = `playerdle-stats:${SPORT}:classic`

function writeHistory(results: Partial<GameResult>[]) {
  localStorage.setItem(KEY, JSON.stringify(results))
}

// Fix "today" to 2024-06-15 noon local time so date arithmetic is deterministic.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe("calculateStats — empty history", () => {
  it("returns zero stats", () => {
    const stats = calculateStats(SPORT)
    expect(stats).toEqual({
      played: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: {},
    })
  })
})

describe("calculateStats — winPercentage", () => {
  it("rounds to nearest integer", () => {
    writeHistory([
      { date: "2024-06-10", won: true, guesses: 3 },
      { date: "2024-06-11", won: false, guesses: 6 },
      { date: "2024-06-12", won: true, guesses: 4 },
    ])
    const stats = calculateStats(SPORT)
    expect(stats.played).toBe(3)
    expect(stats.winPercentage).toBe(67) // 2/3 = 66.67 → 67
  })
})

describe("calculateStats — guessDistribution", () => {
  it("counts wins per guess count, ignores losses", () => {
    writeHistory([
      { date: "2024-06-10", won: true, guesses: 1 },
      { date: "2024-06-11", won: true, guesses: 3 },
      { date: "2024-06-12", won: true, guesses: 3 },
      { date: "2024-06-13", won: false, guesses: 6 },
    ])
    const stats = calculateStats(SPORT)
    expect(stats.guessDistribution[1]).toBe(1)
    expect(stats.guessDistribution[3]).toBe(2)
    expect(stats.guessDistribution[6]).toBe(0)
  })
})

describe("calculateStats — currentStreak", () => {
  it("is 1 after a single win today", () => {
    writeHistory([{ date: "2024-06-15", won: true, guesses: 3 }])
    expect(calculateStats(SPORT).currentStreak).toBe(1)
  })

  it("counts multiple consecutive wins correctly", () => {
    writeHistory([
      { date: "2024-06-13", won: true, guesses: 2 },
      { date: "2024-06-14", won: true, guesses: 4 },
      { date: "2024-06-15", won: true, guesses: 1 },
    ])
    expect(calculateStats(SPORT).currentStreak).toBe(3)
  })

  it("resets to 0 on most recent loss", () => {
    writeHistory([
      { date: "2024-06-13", won: true, guesses: 2 },
      { date: "2024-06-14", won: true, guesses: 3 },
      { date: "2024-06-15", won: false, guesses: 6 },
    ])
    expect(calculateStats(SPORT).currentStreak).toBe(0)
  })

  it("stops counting at a loss mid-streak", () => {
    writeHistory([
      { date: "2024-06-12", won: true, guesses: 2 },
      { date: "2024-06-13", won: false, guesses: 6 },
      { date: "2024-06-14", won: true, guesses: 3 },
      { date: "2024-06-15", won: true, guesses: 1 },
    ])
    expect(calculateStats(SPORT).currentStreak).toBe(2)
  })

  it("is 0 when most recent win is more than 1 day ago", () => {
    writeHistory([
      { date: "2024-06-12", won: true, guesses: 2 },
      { date: "2024-06-13", won: true, guesses: 3 },
      // gap: no play on 2024-06-14 or 2024-06-15
    ])
    expect(calculateStats(SPORT).currentStreak).toBe(0)
  })

  it("counts yesterday's win as active", () => {
    writeHistory([{ date: "2024-06-14", won: true, guesses: 2 }])
    expect(calculateStats(SPORT).currentStreak).toBe(1)
  })

  it("excludes archive results from streak", () => {
    writeHistory([
      { date: "2024-06-13", won: true, guesses: 2, archive: true },
      { date: "2024-06-14", won: true, guesses: 3 },
      { date: "2024-06-15", won: true, guesses: 1 },
    ])
    // archive entry doesn't count, so streak is 2 (Jun 14 + Jun 15)
    expect(calculateStats(SPORT).currentStreak).toBe(2)
  })
})

describe("calculateStats — maxStreak", () => {
  it("is 1 for a single win", () => {
    writeHistory([{ date: "2024-06-15", won: true, guesses: 3 }])
    expect(calculateStats(SPORT).maxStreak).toBe(1)
  })

  it("tracks longest run across multiple runs", () => {
    writeHistory([
      { date: "2024-06-10", won: true, guesses: 2 },
      { date: "2024-06-11", won: true, guesses: 3 },
      { date: "2024-06-12", won: false, guesses: 6 },
      { date: "2024-06-13", won: true, guesses: 1 },
      { date: "2024-06-14", won: true, guesses: 2 },
      { date: "2024-06-15", won: true, guesses: 3 },
    ])
    expect(calculateStats(SPORT).maxStreak).toBe(3)
  })

  it("is independent of currentStreak expiry", () => {
    writeHistory([
      { date: "2024-05-01", won: true, guesses: 1 },
      { date: "2024-05-02", won: true, guesses: 2 },
      { date: "2024-05-03", won: true, guesses: 3 },
      { date: "2024-05-04", won: true, guesses: 4 },
      // 6 weeks later — current streak is 0 but maxStreak should be 4
    ])
    const stats = calculateStats(SPORT)
    expect(stats.currentStreak).toBe(0)
    expect(stats.maxStreak).toBe(4)
  })
})
