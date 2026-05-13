// Build-time validator for Playerdle sport configs.
//
// Decoupled from apps/react — the sport list and the per-sport loader live
// inline here so `pnpm run validate:sports` doesn't depend on app-internal
// import paths. The actual SportConfig modules + validation logic still live
// in apps/react and are pulled in via filesystem-relative dynamic imports.

type SportId = "nfl" | "mlb" | "nhl" | "nba"

const SPORT_IDS: SportId[] = ["nfl", "mlb", "nhl", "nba"]

function getAllSportMeta(): { id: SportId }[] {
  return SPORT_IDS.map(id => ({ id }))
}

async function loadSportConfig(id: SportId) {
  switch (id) {
    case "nfl":
      return (await import("../apps/react/src/games/playerdle/sports/nfl")).default
    case "mlb":
      return (await import("../apps/react/src/games/playerdle/sports/mlb")).default
    case "nhl":
      return (await import("../apps/react/src/games/playerdle/sports/nhl")).default
    case "nba":
      return (await import("../apps/react/src/games/playerdle/sports/nba")).default
  }
}

async function main() {
  const { validateAllSportConfigs } = await import(
    "../apps/react/src/games/playerdle/sports/validation"
  )

  const sports = await Promise.all(getAllSportMeta().map(meta => loadSportConfig(meta.id)))
  const errors = validateAllSportConfigs(sports)

  if (errors.length > 0) {
    console.error("Sport config validation failed:\n")
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    console.error(`\nFound ${errors.length} validation error(s).`)
    process.exit(1)
  }

  console.log("Sport config validation passed.")
}

main().catch(error => {
  console.error("Validation script failed:", error)
  process.exit(1)
})
