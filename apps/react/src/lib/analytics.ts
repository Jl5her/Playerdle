import { addGameBreadcrumb, countMetric, distributionMetric } from "./sentry"

// Low-cardinality props sent as metric attributes (IDs, dates and timings are left out)
const METRIC_ATTRIBUTES = [
  "game",
  "sport",
  "variant",
  "mode",
  "is_archive",
  "is_correct",
  "won",
  "panel",
  "is_onboarding",
] as const

function pickAttributes(props: object): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {}
  for (const key of METRIC_ATTRIBUTES) {
    const value = (props as Record<string, unknown>)[key]
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attributes[key] = value
    }
  }
  return attributes
}

/** Records a game event as a Sentry breadcrumb (error context) and a counter metric. */
function capture(event: string, props: object) {
  addGameBreadcrumb(event, props as Record<string, unknown>)
  countMetric(event, pickAttributes(props))
}

type GameId = "playerdle" | "journeyman" | "statehue"

interface BaseGameProps {
  game: GameId
  sport?: string
  variant?: string
  mode: "daily" | "arcade"
}

export interface GameStartProps extends BaseGameProps {
  date_key?: string
  is_archive?: boolean
}

export interface GuessSubmittedProps extends BaseGameProps {
  guess_number: number
  is_correct: boolean
  seconds_elapsed: number
}

export interface GameCompleteProps extends BaseGameProps {
  won: boolean
  guesses: number
  seconds_to_complete: number
  date_key?: string
  is_archive?: boolean
}

export interface GameAbandonedProps extends BaseGameProps {
  guesses_made: number
  max_guesses: number
  seconds_active: number
}

export interface PanelOpenedProps {
  panel: "guide" | "stats"
  game: GameId
  sport?: string
  variant?: string
  mode: "daily" | "arcade"
  is_onboarding?: boolean
}

export function trackGameStart(props: GameStartProps) {
  capture("game_start", props)
}

export function trackGuessSubmitted(props: GuessSubmittedProps) {
  capture("guess_submitted", props)
}

export function trackGameComplete(props: GameCompleteProps) {
  capture("game_complete", props)
  const attributes = pickAttributes(props)
  distributionMetric("game_complete.guesses", props.guesses, undefined, attributes)
  distributionMetric("game_complete.duration", props.seconds_to_complete, "second", attributes)
}

export function trackGameAbandoned(props: GameAbandonedProps) {
  capture("game_abandoned", props)
}

export function trackPanelOpened(props: PanelOpenedProps) {
  capture("panel_opened", props)
}
