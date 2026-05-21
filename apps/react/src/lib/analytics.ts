import posthog from "posthog-js"

let ready = false

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "always",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_external_dependency_loading: true,
  })
  ready = true
}

function capture(event: string, props: object) {
  if (!ready) return
  posthog.capture(event, props)
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
}

export function trackGameAbandoned(props: GameAbandonedProps) {
  capture("game_abandoned", props)
}

export function trackPanelOpened(props: PanelOpenedProps) {
  capture("panel_opened", props)
}
