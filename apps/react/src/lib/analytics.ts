import posthog from "posthog-js"

let ready = false

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "never", // fully anonymous — no user identity stored
    autocapture: false,       // only track explicit events
    capture_pageview: true,
    capture_pageleave: false,
  })
  ready = true
}

export interface GameCompleteProps {
  game: "playerdle" | "journeyman" | "statehue"
  sport?: string   // nfl | mlb | nba | nhl
  variant?: string // classic | fanatic (playerdle) · pro | collegiate (statehue)
  mode: "daily" | "arcade"
  won: boolean
  guesses: number
}

export function trackGameComplete(props: GameCompleteProps) {
  if (!ready) return
  posthog.capture("game_complete", props)
}
