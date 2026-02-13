import nbaTeams from "../data/nba/teams.json"
import nbaPlayers from "../data/nba/players.json"
import nbaAnswerPoolIds from "../data/nba/answer_pool.json"
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
}

export default nbaConfig
