import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { Player, SportColumn, SportConfig } from "@/games/playerdle/sports"
import { StatsContent } from "@/games/playerdle/modals/stats-content"

const nflColumns: SportColumn[] = [
  {
    id: "conference",
    label: "CONF",
    key: "conference",
    evaluator: { type: "match" as const },
    example: { value: "AFC", status: "correct" as const },
  },
  {
    id: "division",
    label: "DIV",
    key: "division",
    evaluator: { type: "match" as const },
    example: { value: "NFC West", status: "close" as const },
  },
  {
    id: "team",
    label: "TEAM",
    key: "team",
    evaluator: { type: "match" as const },
    example: { value: "SF", status: "incorrect" as const },
  },
  {
    id: "position",
    label: "POS",
    key: "position",
    evaluator: { type: "match" as const },
    example: { value: "QB", status: "correct" as const },
  },
  {
    id: "number",
    label: "#",
    key: "number",
    evaluator: { type: "comparison" as const, closeWithin: 5, showDirection: true },
    example: { value: "10", status: "close" as const, arrow: "↑" },
  },
]

const nflConfig: SportConfig = {
  id: "nfl",
  slug: "" as const,
  displayName: "NFL",
  subtitle: "Can you name the NFL player in 6 tries?",
  teams: [],
  players: [],
  answerPool: [],
  columns: nflColumns,
  variants: [],
}

const mockPlayer: Player = {
  id: "mahomes",
  name: "Patrick Mahomes",
  conference: "AFC",
  division: "AFC West",
  team: "KC",
  position: "QB",
  number: 15,
}

const mockGuesses: Player[] = [
  {
    id: "burrow",
    name: "Joe Burrow",
    conference: "AFC",
    division: "AFC North",
    team: "CIN",
    position: "QB",
    number: 9,
  },
  {
    id: "herbert",
    name: "Justin Herbert",
    conference: "AFC",
    division: "AFC West",
    team: "LAC",
    position: "QB",
    number: 10,
  },
  {
    id: "jackson",
    name: "Lamar Jackson",
    conference: "AFC",
    division: "AFC North",
    team: "BAL",
    position: "QB",
    number: 8,
  },
]

const meta = {
  title: "Playerdle/Modals/StatsContent",
  component: StatsContent,
  parameters: { layout: "padded" },
  decorators: [
    Story => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    sport: nflConfig,
    mode: "daily" as const,
  },
} satisfies Meta<typeof StatsContent>

export default meta
type Story = StoryObj<typeof meta>

export const DailyStats: Story = {
  args: {
    mode: "daily",
    showStatsOnly: true,
    sport: nflConfig,
  },
}

export const ArcadeWon: Story = {
  args: {
    mode: "arcade",
    won: true,
    player: mockPlayer,
    guessCount: 3,
    guesses: mockGuesses.slice(0, 3),
    sport: nflConfig,
    onPlayAgain: fn(),
  },
}

export const ArcadeLost: Story = {
  args: {
    mode: "arcade",
    lost: true,
    player: mockPlayer,
    guessCount: 6,
    sport: nflConfig,
    onPlayAgain: fn(),
  },
}

export const WithShare: Story = {
  args: {
    mode: "daily",
    showStatsOnly: true,
    includeShareButton: true,
    player: mockPlayer,
    won: true,
    sport: nflConfig,
  },
}

export const Hidden: Story = {
  render: () => (
    <div className="max-w-sm">
      <p className="text-xs text-primary-500 dark:text-primary-300 mb-2 italic">
        StatsContent returns null when won=false, lost=false, and showStatsOnly is not set.
      </p>
      <StatsContent
        mode="daily"
        sport={nflConfig}
        won={false}
        lost={false}
      />
    </div>
  ),
}
