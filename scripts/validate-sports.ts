import { getAllSportMeta, loadSportConfig, validateAllSportConfigs } from "../src/sports"

async function main() {
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
