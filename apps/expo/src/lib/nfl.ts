import answerPoolIds from "@playerdle/data/playerdle/nfl/answer_pool.json"
import playersJson from "@playerdle/data/playerdle/nfl/players.json"
import type { Player, SportConfig } from "./sport"

const players = playersJson as unknown as Player[]
const answerPoolSet = new Set(answerPoolIds as string[])

export const nfl: SportConfig = {
  id: "nfl",
  displayName: "NFL",
  players,
  answerPool: players.filter(p => answerPoolSet.has(p.id)),
  columns: [
    { id: "conference", label: "CONF", key: "conference", evaluator: { type: "match" } },
    { id: "division", label: "DIV", key: "division", evaluator: { type: "match" } },
    { id: "team", label: "TEAM", key: "teamAbbr", evaluator: { type: "match" } },
    { id: "position", label: "POS", key: "position", evaluator: { type: "match" } },
    {
      id: "number",
      label: "#",
      key: "number",
      evaluator: { type: "comparison", closeWithin: 5, showDirection: true },
    },
  ],
}
