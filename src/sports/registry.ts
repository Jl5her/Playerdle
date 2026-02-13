import type { SportConfig, SportId, SportInfo } from "./types"

const SPORT_META: Record<SportId, SportInfo> = {
  nfl: {
    id: "nfl",
    slug: "",
    displayName: "NFL",
    subtitle: "Guess the NFL player in 6 tries",
  },
  mlb: {
    id: "mlb",
    slug: "mlb",
    displayName: "MLB",
    subtitle: "Guess the MLB player in 6 tries",
  },
  nhl: {
    id: "nhl",
    slug: "nhl",
    displayName: "NHL",
    subtitle: "Guess the NHL player in 6 tries",
  },
  nba: {
    id: "nba",
    slug: "nba",
    displayName: "NBA",
    subtitle: "Guess the NBA player in 6 tries",
  },
}

export function getSportIdFromPath(pathname: string): SportId {
  const firstSegment = pathname.replace(/^\/+/, "").split("/")[0].toLowerCase()
  if (firstSegment === "mlb") return "mlb"
  if (firstSegment === "nhl") return "nhl"
  if (firstSegment === "nba") return "nba"
  return "nfl"
}

export function getSportMetaById(id: SportId): SportInfo {
  return SPORT_META[id]
}

export function getAllSportMeta(): SportInfo[] {
  return Object.values(SPORT_META)
}

export async function loadSportConfig(id: SportId): Promise<SportConfig> {
  if (id === "nfl") {
    const mod = await import("./nfl")
    return mod.default
  }
  if (id === "mlb") {
    const mod = await import("./mlb")
    return mod.default
  }
  if (id === "nhl") {
    const mod = await import("./nhl")
    return mod.default
  }

  const mod = await import("./nba")
  return mod.default
}
