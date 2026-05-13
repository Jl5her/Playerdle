import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
} from "@fortawesome/free-solid-svg-icons"
import type { SportId } from "./types"

const SPORT_ICONS: Record<SportId, IconDefinition> = {
  nfl: faFootball,
  mlb: faBaseball,
  nhl: faHockeyPuck,
  nba: faBasketball,
}

export function getSportIcon(id: SportId): IconDefinition {
  return SPORT_ICONS[id]
}
