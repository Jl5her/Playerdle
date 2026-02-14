import mlbAnswerPoolIds from "../data/mlb/answer_pool.json"
import mlbFanaticAnswerPoolIds from "../data/mlb/fanatic_answer_pool.json"
import mlbFanaticPlayers from "../data/mlb/fanatic_players.json"
import mlbPlayers from "../data/mlb/players.json"
import mlbTeams from "../data/mlb/teams.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedTeam {
  id: string
  name: string
  abbr: string
  colors?: string[]
}

const teamsData = mlbTeams as unknown as GeneratedTeam[]
const playersData = mlbPlayers as unknown as Player[]
const fanaticPlayersData = mlbFanaticPlayers as unknown as Player[]
const answerPoolIdSet = new Set(mlbAnswerPoolIds as unknown as string[])
const fanaticAnswerPoolIdSet = new Set(mlbFanaticAnswerPoolIds as unknown as string[])

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
  variants: [
    {
      id: "fanatic",
      label: "Fanatic",
      subtitle: "Season stat challenge (hitters only)",
      players: fanaticPlayersData,
      answerPool: fanaticPlayersData.filter(player => fanaticAnswerPoolIdSet.has(player.id)),
      columns: [
        {
          id: "batting-average",
          label: "AVG",
          key: "avg",
          evaluator: { type: "comparison", closeWithin: 0.011, showDirection: true },
          example: { value: "0.287", arrow: "\u2191", status: "close" },
        },
        {
          id: "home-runs",
          label: "HR",
          key: "hr",
          evaluator: { type: "comparison", closeWithin: 4, showDirection: true },
          example: { value: "31", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "runs-batted-in",
          label: "RBI",
          key: "rbi",
          evaluator: { type: "comparison", closeWithin: 10, showDirection: true },
          example: { value: "92", arrow: "\u2191", status: "close" },
        },
        {
          id: "stolen-bases",
          label: "SB",
          key: "sb",
          evaluator: { type: "comparison", closeWithin: 2, showDirection: true },
          example: { value: "18", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "ops",
          label: "OPS",
          key: "ops",
          evaluator: { type: "comparison", closeWithin: 0.035, showDirection: true },
          example: { value: "0.845", arrow: "\u2191", status: "close" },
        },
      ],
    },
  ],
}

export default mlbConfig
