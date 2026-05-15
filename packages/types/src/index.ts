// Shared types used across the Playerdle monorepo.
// Pure type-only — no runtime imports — so this package is safe to depend on
// from anywhere (apps, other packages, scripts).

/** Daily puzzle vs. unlimited replay arcade. */
export type GameMode = "daily" | "arcade"

/** Outcome shape stored in stats history. */
export interface GameResult {
  date: string
  won: boolean
  guesses: number
  guessIds?: string[]
  /** True when played from the archive after the puzzle's date. Excluded from streak math. */
  archive?: boolean
}

/** Aggregated stats summary surfaced to the player. */
export interface Stats {
  played: number
  winPercentage: number
  currentStreak: number
  maxStreak: number
  guessDistribution: Record<number, number>
}
