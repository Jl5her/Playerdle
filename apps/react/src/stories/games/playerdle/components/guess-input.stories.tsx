import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { Player } from "@/games/playerdle/sports"
import GuessInput from "./guess-input"

const mockPlayers: Player[] = [
  { id: "mahomes", name: "Patrick Mahomes", conference: "AFC", division: "AFC West", team: "KC", position: "QB", number: 15 },
  { id: "allen", name: "Josh Allen", conference: "AFC", division: "AFC East", team: "BUF", position: "QB", number: 17 },
  { id: "burrow", name: "Joe Burrow", conference: "AFC", division: "AFC North", team: "CIN", position: "QB", number: 9 },
  { id: "herbert", name: "Justin Herbert", conference: "AFC", division: "AFC West", team: "LAC", position: "QB", number: 10 },
  { id: "jackson", name: "Lamar Jackson", conference: "AFC", division: "AFC North", team: "BAL", position: "QB", number: 8 },
  { id: "stafford", name: "Matthew Stafford", conference: "NFC", division: "NFC West", team: "LAR", position: "QB", number: 9 },
  { id: "prescott", name: "Dak Prescott", conference: "NFC", division: "NFC East", team: "DAL", position: "QB", number: 4 },
  { id: "purdy", name: "Brock Purdy", conference: "NFC", division: "NFC West", team: "SF", position: "QB", number: 13 },
]

const meta = {
  title: "Playerdle/GuessInput",
  component: GuessInput,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    guessedIds: { control: false },
  },
  args: {
    onGuess: fn(),
    guessedIds: new Set<string>(),
    disabled: false,
    players: mockPlayers,
  },
} satisfies Meta<typeof GuessInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <GuessInput
      onGuess={fn()}
      guessedIds={new Set<string>()}
      disabled={false}
      players={mockPlayers}
    />
  ),
}

export const SomeGuessed: Story = {
  render: () => (
    <GuessInput
      onGuess={fn()}
      guessedIds={new Set(["mahomes", "allen"])}
      disabled={false}
      players={mockPlayers}
    />
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-primary-500 dark:text-primary-300 text-center italic">
        Input disabled when game is over
      </p>
      <GuessInput
        onGuess={fn()}
        guessedIds={new Set<string>()}
        disabled={true}
        players={mockPlayers}
      />
    </div>
  ),
}

export const FewPlayers: Story = {
  render: () => (
    <GuessInput
      onGuess={fn()}
      guessedIds={new Set<string>()}
      disabled={false}
      players={mockPlayers.slice(0, 3)}
    />
  ),
}
