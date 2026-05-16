import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Player, SportColumn } from "@/games/playerdle/sports"
import GuessGrid from "./guess-grid"

const mockColumns: SportColumn[] = [
  { id: "conference", label: "CONF", key: "conference", evaluator: { type: "match" }, example: { value: "AFC", status: "correct" } },
  { id: "division", label: "DIV", key: "division", evaluator: { type: "match" }, example: { value: "AFC West", status: "incorrect" } },
  { id: "team", label: "TEAM", key: "team", evaluator: { type: "match" }, example: { value: "KC", status: "correct" } },
  { id: "position", label: "POS", key: "position", evaluator: { type: "match" }, example: { value: "QB", status: "incorrect" } },
  { id: "number", label: "#", key: "number", evaluator: { type: "comparison", closeWithin: 5, showDirection: true }, example: { value: "15", status: "close", arrow: "↑" } },
]

const mockAnswer: Player = {
  id: "mahomes",
  name: "Patrick Mahomes",
  conference: "AFC",
  division: "AFC West",
  team: "KC",
  position: "QB",
  number: 15,
}

const mockGuesses: Player[] = [
  { id: "burrow", name: "Joe Burrow", conference: "AFC", division: "AFC North", team: "CIN", position: "QB", number: 9 },
  { id: "herbert", name: "Justin Herbert", conference: "AFC", division: "AFC West", team: "LAC", position: "QB", number: 10 },
]

const sixGuesses: Player[] = [
  { id: "burrow", name: "Joe Burrow", conference: "AFC", division: "AFC North", team: "CIN", position: "QB", number: 9 },
  { id: "herbert", name: "Justin Herbert", conference: "AFC", division: "AFC West", team: "LAC", position: "QB", number: 10 },
  { id: "allen", name: "Josh Allen", conference: "AFC", division: "AFC East", team: "BUF", position: "QB", number: 17 },
  { id: "jackson", name: "Lamar Jackson", conference: "AFC", division: "AFC North", team: "BAL", position: "QB", number: 8 },
  { id: "stafford", name: "Matthew Stafford", conference: "NFC", division: "NFC West", team: "LAR", position: "QB", number: 9 },
  { id: "prescott", name: "Dak Prescott", conference: "NFC", division: "NFC East", team: "DAL", position: "QB", number: 4 },
]

const guessesWithAnswer: Player[] = [
  { id: "burrow", name: "Joe Burrow", conference: "AFC", division: "AFC North", team: "CIN", position: "QB", number: 9 },
  { id: "mahomes", name: "Patrick Mahomes", conference: "AFC", division: "AFC West", team: "KC", position: "QB", number: 15 },
  { id: "herbert", name: "Justin Herbert", conference: "AFC", division: "AFC West", team: "LAC", position: "QB", number: 10 },
]

const meta = {
  title: "Playerdle/GuessGrid",
  component: GuessGrid,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    guesses: [],
    answer: mockAnswer,
    maxGuesses: 6,
    latestIndex: -1,
    columns: mockColumns,
    hideAnswer: false,
  },
} satisfies Meta<typeof GuessGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    guesses: [],
    latestIndex: -1,
  },
}

export const OneGuess: Story = {
  args: {
    guesses: [mockGuesses[0]],
    latestIndex: 0,
  },
}

export const ThreeGuesses: Story = {
  args: {
    guesses: [mockGuesses[0], mockGuesses[1], { id: "allen", name: "Josh Allen", conference: "AFC", division: "AFC East", team: "BUF", position: "QB", number: 17 }],
    latestIndex: 2,
  },
}

export const SixGuesses: Story = {
  args: {
    guesses: sixGuesses,
    latestIndex: 5,
  },
}

export const WithAnimation: Story = {
  args: {
    guesses: [mockGuesses[0]],
    latestIndex: 0,
  },
}

export const HiddenAnswer: Story = {
  args: {
    guesses: guessesWithAnswer,
    latestIndex: 2,
    hideAnswer: true,
  },
}
