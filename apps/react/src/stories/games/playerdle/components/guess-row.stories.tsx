import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Player, SportColumn } from "@/games/playerdle/sports"
import GuessRow from "@/games/playerdle/components/guess-row"

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

const allWrongGuess: Player = {
  id: "stafford",
  name: "Matthew Stafford",
  conference: "NFC",
  division: "NFC West",
  team: "LAR",
  position: "WR",
  number: 9,
}

const mixedGuess: Player = {
  id: "burrow",
  name: "Joe Burrow",
  conference: "AFC",
  division: "AFC North",
  team: "CIN",
  position: "QB",
  number: 9,
}

const animatedGuess: Player = {
  id: "herbert",
  name: "Justin Herbert",
  conference: "AFC",
  division: "AFC West",
  team: "LAC",
  position: "QB",
  number: 10,
}

const meta = {
  title: "Playerdle/GuessRow",
  component: GuessRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    result: { guess: mockAnswer, answer: mockAnswer },
    columns: mockColumns,
    animate: false,
  },
} satisfies Meta<typeof GuessRow>

export default meta
type Story = StoryObj<typeof meta>

export const AllCorrect: Story = {
  args: {
    result: { guess: mockAnswer, answer: mockAnswer },
    columns: mockColumns,
  },
}

export const AllWrong: Story = {
  args: {
    result: { guess: allWrongGuess, answer: mockAnswer },
    columns: mockColumns,
  },
}

export const MixedResult: Story = {
  args: {
    result: { guess: mixedGuess, answer: mockAnswer },
    columns: mockColumns,
  },
}

export const WithAnimation: Story = {
  args: {
    result: { guess: animatedGuess, answer: mockAnswer },
    columns: mockColumns,
    animate: true,
  },
}

export const TwoRows: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <GuessRow
        result={{ guess: mockAnswer, answer: mockAnswer }}
        columns={mockColumns}
      />
      <GuessRow
        result={{ guess: allWrongGuess, answer: mockAnswer }}
        columns={mockColumns}
      />
    </div>
  ),
}
