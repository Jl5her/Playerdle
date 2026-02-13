import mlbTeams from "../data/mlb/teams.json"
import mlbPlayers from "../data/mlb/players.json"
import mlbAnswerPoolIds from "../data/mlb/answer_pool.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedTeam {
  id: string
  name: string
  abbr: string
  colors?: string[]
}

const teamsData = mlbTeams as unknown as GeneratedTeam[]
const playersData = mlbPlayers as unknown as Player[]
const answerPoolIdSet = new Set(mlbAnswerPoolIds as unknown as string[])

const teams: SportTeam[] = teamsData.map(team => ({
  id: team.id,
  name: team.name,
  abbr: team.abbr,
  colors: team.colors && team.colors.length >= 2 ? [team.colors[0], team.colors[1]] : undefined,
}))

const mlbConfig: SportConfig = {
  id: "mlb",
  slug: "mlb",
  displayName: "MLB",
  subtitle: "Guess the MLB player in 6 tries",
  teams,
  players: playersData,
  answerPool: playersData.filter(player => answerPoolIdSet.has(player.id)),
  columns: [
    {
      id: "league",
      label: "LG",
      key: "league",
      evaluator: { type: "match" },
      example: { value: "NL", status: "correct" },
    },
    {
      id: "division",
      label: "DIV",
      key: "division",
      topKey: "league",
      evaluator: { type: "match" },
      example: { value: "West", topValue: "NL", status: "incorrect" },
    },
    {
      id: "team",
      label: "TEAM",
      key: "teamAbbr",
      evaluator: { type: "match" },
      example: { value: "LAD", status: "incorrect" },
    },
    {
      id: "position",
      label: "POS",
      key: "position",
      evaluator: { type: "match" },
      example: { value: "OF", status: "correct" },
    },
    {
      id: "number",
      label: "#",
      key: "number",
      evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
      example: { value: "27", arrow: "\u2191", status: "close" },
    },
  ],
}

export default mlbConfig
