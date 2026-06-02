import clsx from "clsx"
import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import nflTeams from "@playerdle/data/playerdle/nfl/teams.json"
import mlbTeams from "@playerdle/data/playerdle/mlb/teams.json"
import nbaTeams from "@playerdle/data/playerdle/nba/teams.json"
import nhlTeams from "@playerdle/data/playerdle/nhl/teams.json"

type RawTeam = {
  id: string
  name: string
  abbr: string
  conference: string
  division: string
  colors?: string[]
}

const SPORTS = [
  { id: "nfl", label: "NFL", teams: nflTeams as RawTeam[] },
  { id: "mlb", label: "MLB", teams: mlbTeams as RawTeam[] },
  { id: "nba", label: "NBA", teams: nbaTeams as RawTeam[] },
  { id: "nhl", label: "NHL", teams: nhlTeams as RawTeam[] },
]

function groupTeams(teams: RawTeam[]): Record<string, Record<string, RawTeam[]>> {
  const map: Record<string, Record<string, RawTeam[]>> = {}
  for (const team of teams) {
    map[team.conference] ??= {}
    map[team.conference][team.division] ??= []
    map[team.conference][team.division].push(team)
  }
  for (const divisions of Object.values(map)) {
    for (const teams of Object.values(divisions)) {
      teams.sort((a, b) => a.name.localeCompare(b.name))
    }
  }
  return map
}

export function TeamColorsKey() {
  const { sport: sportParam } = useParams<{ sport: string }>()
  const activeSportId = SPORTS.find(s => s.id === sportParam)?.id ?? "nfl"
  const sport = SPORTS.find(s => s.id === activeSportId)!
  const grouped = groupTeams(sport.teams)
  const conferences = Object.keys(grouped).sort()

  useEffect(() => {
    const targets = [
      document.documentElement,
      document.body,
      document.getElementById("root"),
    ].filter(Boolean) as HTMLElement[]
    const prev = targets.map(el => ({ overflow: el.style.overflow, height: el.style.height }))
    for (const el of targets) {
      el.style.overflow = "visible"
      el.style.height = "auto"
    }
    return () => {
      targets.forEach((el, i) => {
        el.style.overflow = prev[i].overflow
        el.style.height = prev[i].height
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 p-6">
      <h1 className="text-2xl font-black tracking-wide text-primary-700 dark:text-primary-50 mb-6">
        Team Colors Key
      </h1>

      <div className="flex gap-2 mb-8">
        {SPORTS.map(s => (
          <Link
            key={s.id}
            to={`/team-colors-key/${s.id}`}
            className={clsx(
              "px-4 py-2 rounded-lg font-bold text-sm transition-colors",
              activeSportId === s.id
                ? "bg-primary-700 text-white dark:bg-primary-200 dark:text-primary-900"
                : "bg-primary-200 text-primary-700 dark:bg-primary-700 dark:text-primary-200 hover:bg-primary-300 dark:hover:bg-primary-600",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {conferences.map(conference => {
        const divisions = Object.keys(grouped[conference]).sort()
        return (
          <div
            key={conference}
            className="mb-10"
          >
            <h2 className="text-lg font-black uppercase tracking-widest text-primary-700 dark:text-primary-200 border-b-2 border-primary-200 dark:border-primary-700 pb-2 mb-4">
              {conference}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {divisions.map(division => (
                <div
                  key={division}
                  className="bg-white dark:bg-primary-800 rounded-xl p-4 shadow-sm"
                >
                  <h3 className="text-xs font-bold text-primary-400 dark:text-primary-400 uppercase tracking-widest mb-3">
                    {division}
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {grouped[conference][division].map(team => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2.5"
                      >
                        <div className="flex gap-1 shrink-0">
                          {(team.colors ?? []).map((color, i) => (
                            <div
                              key={i}
                              className={clsx(
                                "w-5 h-5 rounded border shrink-0",
                                color === "transparent"
                                  ? "diamond-transparent border-black/10 dark:border-white/10"
                                  : "border-black/10 dark:border-white/10",
                              )}
                              style={color !== "transparent" ? { backgroundColor: color } : undefined}
                              title={color}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-primary-800 dark:text-primary-100 leading-tight">
                          {team.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
