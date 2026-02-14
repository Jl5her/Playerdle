import nhlAnswerPoolIds from "../data/nhl/answer_pool.json"
import nhlFanaticAnswerPoolIds from "../data/nhl/fanatic_answer_pool.json"
import nhlFanaticPlayers from "../data/nhl/fanatic_players.json"
import nhlPlayers from "../data/nhl/players.json"
import nhlTeams from "../data/nhl/teams.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedTeam {
  id: string
  name: string
  abbr: string
  colors?: string[]
}

const teamsData = nhlTeams as unknown as GeneratedTeam[]
const playersData = nhlPlayers as unknown as Player[]
const fanaticPlayersData = nhlFanaticPlayers as unknown as Player[]
const answerPoolIdSet = new Set(nhlAnswerPoolIds as unknown as string[])
const fanaticAnswerPoolIdSet = new Set(nhlFanaticAnswerPoolIds as unknown as string[])

const normalizedPlayers = playersData.map(player => ({
  ...player,
  division: String(player.division ?? "")
    .replace(/\s+Division$/i, "")
    .trim(),
}))

const teams: SportTeam[] = teamsData.map(team => ({
  id: team.id,
  name: team.name,
  abbr: team.abbr,
  colors: team.colors && team.colors.length >= 2 ? [team.colors[0], team.colors[1]] : undefined,
}))

const nhlConfig: SportConfig = {
  id: "nhl",
  slug: "nhl",
  displayName: "NHL",
  subtitle: "Guess the NHL player in 6 tries",
  teams,
  players: normalizedPlayers,
  answerPool: normalizedPlayers.filter(player => answerPoolIdSet.has(player.id)),
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
      example: { value: "VGK", status: "incorrect" },
    },
    {
      id: "position",
      label: "POS",
      key: "position",
      evaluator: { type: "match" },
      example: { value: "C", status: "correct" },
    },
    {
      id: "number",
      label: "#",
      key: "number",
      evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
      example: { value: "29", arrow: "\u2191", status: "close" },
    },
  ],
  variants: [
    {
      id: "fanatic",
      label: "Fanatic",
      subtitle: "Season stat challenge (skaters only)",
      players: fanaticPlayersData,
      answerPool: fanaticPlayersData.filter(player => fanaticAnswerPoolIdSet.has(player.id)),
      columns: [
        {
          id: "goals",
          label: "G",
          key: "goals",
          evaluator: { type: "comparison", closeWithin: 3, showDirection: true },
          example: { value: "28", arrow: "\u2191", status: "close" },
        },
        {
          id: "assists",
          label: "A",
          key: "assists",
          evaluator: { type: "comparison", closeWithin: 3, showDirection: true },
          example: { value: "42", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "points",
          label: "PTS",
          key: "points",
          evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
          example: { value: "70", arrow: "\u2191", status: "close" },
        },
        {
          id: "shots-on-goal",
          label: "SOG",
          key: "sog",
          evaluator: { type: "comparison", closeWithin: 14, showDirection: true },
          example: { value: "220", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "time-on-ice-per-game",
          label: "TOI/G",
          key: "toiPerGame",
          evaluator: { type: "comparison", closeWithin: 1.4, showDirection: true },
          example: { value: "20.4", arrow: "\u2191", status: "close" },
        },
      ],
    },
  ],
}

export default nhlConfig
