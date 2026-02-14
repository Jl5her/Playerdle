import nbaAnswerPoolIds from "../data/nba/answer_pool.json"
import nbaFanaticAnswerPoolIds from "../data/nba/fanatic_answer_pool.json"
import nbaFanaticPlayers from "../data/nba/fanatic_players.json"
import nbaPlayers from "../data/nba/players.json"
import nbaTeams from "../data/nba/teams.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedTeam {
  id: string
  name: string
  abbr: string
  colors?: string[]
}

const teamsData = nbaTeams as unknown as GeneratedTeam[]
const playersData = nbaPlayers as unknown as Player[]
const answerPoolIdSet = new Set(nbaAnswerPoolIds as unknown as string[])
const fanaticPlayersData = nbaFanaticPlayers as unknown as Player[]
const fanaticAnswerPoolIdSet = new Set(nbaFanaticAnswerPoolIds as unknown as string[])

const teams: SportTeam[] = teamsData.map(team => ({
  id: team.id,
  name: team.name,
  abbr: team.abbr,
  colors: team.colors && team.colors.length >= 2 ? [team.colors[0], team.colors[1]] : undefined,
}))

const nbaConfig: SportConfig = {
  id: "nba",
  slug: "nba",
  displayName: "NBA",
  subtitle: "Guess the NBA player in 6 tries",
  teams,
  players: playersData,
  answerPool: playersData.filter(player => answerPoolIdSet.has(player.id)),
  columns: [
    {
      id: "conference",
      label: "CONF",
      key: "conference",
      evaluator: { type: "match" },
      example: { value: "West", status: "correct" },
    },
    {
      id: "division",
      label: "DIV",
      key: "division",
      evaluator: { type: "match" },
      example: { value: "Pacific", status: "incorrect" },
    },
    {
      id: "team",
      label: "TEAM",
      key: "teamAbbr",
      evaluator: { type: "match" },
      example: { value: "LAL", status: "incorrect" },
    },
    {
      id: "position",
      label: "POS",
      key: "position",
      evaluator: { type: "match" },
      example: { value: "PG", status: "correct" },
    },
    {
      id: "number",
      label: "#",
      key: "number",
      evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
      example: { value: "30", arrow: "\u2191", status: "close" },
    },
  ],
  variants: [
    {
      id: "fanatic",
      label: "Fanatic",
      subtitle: "Guess the NBA player from season averages in 6 tries",
      players: fanaticPlayersData,
      answerPool: fanaticPlayersData.filter(player => fanaticAnswerPoolIdSet.has(player.id)),
      columns: [
        {
          id: "points",
          label: "PTS",
          key: "pts",
          evaluator: { type: "comparison", closeWithin: 2, showDirection: true },
          example: { value: "24.8", arrow: "\u2191", status: "close" },
        },
        {
          id: "rebounds",
          label: "REB",
          key: "reb",
          evaluator: { type: "comparison", closeWithin: 0.7, showDirection: true },
          example: { value: "8.4", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "assists",
          label: "AST",
          key: "ast",
          evaluator: { type: "comparison", closeWithin: 0.5, showDirection: true },
          example: { value: "6.1", arrow: "\u2191", status: "close" },
        },
        {
          id: "steals",
          label: "STL",
          key: "stl",
          evaluator: { type: "comparison", closeWithin: 0.2, showDirection: true },
          example: { value: "1.4", arrow: "\u2193", status: "close" },
        },
        {
          id: "turnovers",
          label: "TOV",
          key: "tov",
          evaluator: { type: "comparison", closeWithin: 0.4, showDirection: true },
          example: { value: "2.3", arrow: "\u2193", status: "close" },
        },
        {
          id: "field-goal-percentage",
          label: "FG%",
          key: "fgPct",
          evaluator: { type: "comparison", closeWithin: 3, showDirection: true },
          example: { value: "49.2", arrow: "\u2191", status: "close" },
        },
        {
          id: "free-throw-percentage",
          label: "FT%",
          key: "ftPct",
          evaluator: { type: "comparison", closeWithin: 2, showDirection: true },
          example: { value: "84.1", arrow: "\u2191", status: "close" },
        },
      ],
    },
  ],
}

export default nbaConfig
