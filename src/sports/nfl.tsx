import nflAnswerPoolIds from "../data/nfl/answer_pool.json"
import nflFanaticAnswerPoolIds from "../data/nfl/fanatic_answer_pool.json"
import nflFanaticPlayers from "../data/nfl/fanatic_players.json"
import nflPlayers from "../data/nfl/players.json"
import nflTeams from "../data/nfl/teams.json"
import type { Player, SportConfig, SportTeam } from "./types"

interface GeneratedNFLTeam {
  id: string
  abbr: string
  name: string
  colors?: string[]
}

const teamsData = nflTeams as unknown as GeneratedNFLTeam[]
const playersData = nflPlayers as unknown as Player[]
const fanaticPlayersData = nflFanaticPlayers as unknown as Player[]

const teams: SportTeam[] = teamsData.map(team => ({
  id: team.id,
  name: team.name,
  abbr: team.abbr.toUpperCase(),
  colors:
    team.colors && team.colors.length >= 2
      ? ([team.colors[0], team.colors[1]] as [string, string])
      : undefined,
}))

const answerPoolIdSet = new Set(nflAnswerPoolIds as string[])
const fanaticAnswerPoolIdSet = new Set(nflFanaticAnswerPoolIds as string[])


const nflConfig: SportConfig = {
  id: "nfl",
  slug: "",
  displayName: "NFL",
  subtitle: "Guess the NFL player in 6 tries",
  teams,
  players: playersData,
  answerPool: playersData.filter(player => answerPoolIdSet.has(player.id)),
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
      renderValue: (value: string) => {
        const parts = value.trim().split(/\s+/).filter(Boolean)
        if (parts.length < 2) return value
        return (
          <div className="flex flex-col items-center justify-center">
            <span className="grid-cell-top-text text-center leading-tight">{parts[0]}</span>
            <span className="grid-cell-text text-center leading-tight">{parts.slice(1).join(" ")}</span>
          </div>
        )
      },
      evaluator: { type: "match" },
      example: { value: "NFC South", status: "incorrect" },
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
  variants: [
    {
      id: "fanatic",
      label: "Fanatic",
      subtitle: "Half-PPR fantasy stats (RB/WR/TE only)",
      players: fanaticPlayersData,
      answerPool: fanaticPlayersData.filter(player => fanaticAnswerPoolIdSet.has(player.id)),
      columns: [
        {
          id: "fppg",
          label: "FPPG",
          key: "fppg",
          evaluator: { type: "comparison", closeWithin: 1.3, showDirection: true },
          example: { value: "15.8", arrow: "\u2191", status: "close" },
        },
        {
          id: "receptions-per-game",
          label: "REC/G",
          key: "recPerGame",
          evaluator: { type: "comparison", closeWithin: 0.5, showDirection: true },
          example: { value: "5.4", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "yards-per-game",
          label: "YDS/G",
          key: "ydsPerGame",
          evaluator: { type: "comparison", closeWithin: 7, showDirection: true },
          example: { value: "82.5", arrow: "\u2191", status: "close" },
        },
        {
          id: "touchdowns-per-game",
          label: "TD/G",
          key: "tdPerGame",
          evaluator: { type: "comparison", closeWithin: 0.1, showDirection: true },
          example: { value: "0.60", arrow: "\u2193", status: "incorrect" },
        },
        {
          id: "targets-per-game",
          label: "TGT/G",
          key: "tgtPerGame",
          evaluator: { type: "comparison", closeWithin: 0.7, showDirection: true },
          example: { value: "7.8", arrow: "\u2191", status: "close" },
        },
      ],
    },
  ],
}

export default nflConfig
