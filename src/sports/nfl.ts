import nflPlayers from "../data/nfl/players.json"
import nflTeams from "../data/nfl/teams.json"
import nflAnswerPoolIds from "../data/nfl/answer_pool.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedNFLTeam {
  id: string
  abbr: string
  name: string
  colors?: string[]
}

const teamsData = nflTeams as unknown as GeneratedNFLTeam[]
const playersData = nflPlayers as unknown as Player[]

function normalizeNFLDivision(value: string): string {
  return value
    .replace(/^(AFC|NFC)\s+/i, "")
    .replace(/^American Football Conference\s+/i, "")
    .replace(/^National Football Conference\s+/i, "")
    .trim()
}

const teams: SportTeam[] = teamsData.map(team => ({
  id: team.id,
  name: team.name,
  abbr: team.abbr.toUpperCase(),
  colors: team.colors && team.colors.length >= 2 ? [team.colors[0], team.colors[1]] as [string, string] : undefined,
}))

const answerPoolIdSet = new Set(nflAnswerPoolIds as string[])
const normalizedPlayers = playersData.map(player => ({
  ...player,
  division: normalizeNFLDivision(String(player.division ?? "")),
}))

const nflConfig: SportConfig = {
  id: "nfl",
  slug: "",
  displayName: "NFL",
  subtitle: "Guess the NFL player in 6 tries",
  teams,
  players: normalizedPlayers,
  answerPool: normalizedPlayers.filter(player => answerPoolIdSet.has(player.id)),
  columns: [
    {
      id: "conference",
      label: "CONF",
      key: "conference",
      evaluator: { type: "match" },
      example: { value: "NFC", status: "correct" },
    },
    {
      id: "division",
      label: "DIV",
      key: "division",
      topKey: "conference",
      evaluator: { type: "match" },
      example: { value: "South", topValue: "NFC", status: "incorrect" },
    },
    {
      id: "team",
      label: "TEAM",
      key: "teamAbbr",
      evaluator: { type: "match" },
      example: { value: "ATL", status: "incorrect" },
    },
    {
      id: "position",
      label: "POS",
      key: "position",
      evaluator: { type: "match" },
      example: { value: "QB", status: "correct" },
    },
    {
      id: "number",
      label: "#",
      key: "number",
      evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
      example: { value: "15", arrow: "\u2191", status: "close" },
    },
  ],
}

export default nflConfig
