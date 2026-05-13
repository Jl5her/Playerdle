import type { ReactNode } from "react"

export type SportId = "nfl" | "mlb" | "nhl" | "nba"

export type SportValue = string | number | boolean | null | undefined

export interface Player {
  id: string
  name: string
  [key: string]: SportValue
}

export interface SportTeam {
  id: string
  name: string
  abbr: string
  colors?: [string, string]
}

export interface SportInfo {
  id: SportId
  slug: "" | SportId
  displayName: string
  subtitle: string
}

export type ExampleStatus = "correct" | "close" | "incorrect"

export interface ColumnExample {
  value: string
  status: ExampleStatus
  arrow?: string
}

export type ColumnValueRenderer = (value: string, context?: { player?: Player }) => ReactNode

export type ColumnEvaluator =
  | { type: "match" }
  | { type: "mismatch" }
  | {
      type: "comparison"
      closeWithin?: number
      showDirection?: boolean
    }

export interface SportColumn {
  id: string
  label: string
  key: string
  renderValue?: ColumnValueRenderer
  evaluator: ColumnEvaluator
  example: ColumnExample
}

export interface SportVariant {
  id: string
  label: string
  subtitle?: string
  players: Player[]
  answerPool: Player[]
  columns: SportColumn[]
}

export interface SportConfig extends SportInfo {
  teams: SportTeam[]
  players: Player[]
  answerPool: Player[]
  columns: SportColumn[]
  variants?: SportVariant[]
  activeVariantId?: string
  activeVariantLabel?: string
}
