import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { SportColumn, SportConfig } from "@/games/playerdle/sports"
import { GameGuideBody } from "@/games/playerdle/modals/game-guide-content"

const nflColumns: SportColumn[] = [
  { id: "conference", label: "CONF", key: "conference", evaluator: { type: "match" as const }, example: { value: "AFC", status: "correct" as const } },
  { id: "division", label: "DIV", key: "division", evaluator: { type: "match" as const }, example: { value: "NFC West", status: "close" as const } },
  { id: "team", label: "TEAM", key: "team", evaluator: { type: "match" as const }, example: { value: "SF", status: "incorrect" as const } },
  { id: "position", label: "POS", key: "position", evaluator: { type: "match" as const }, example: { value: "QB", status: "correct" as const } },
  { id: "number", label: "#", key: "number", evaluator: { type: "comparison" as const, closeWithin: 5, showDirection: true }, example: { value: "10", status: "close" as const, arrow: "↑" } },
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

const meta = {
  title: "Playerdle/Modals/GameGuideBody",
  component: GameGuideBody,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    sport: nflConfig,
    mode: "onboarding" as const,
  },
} satisfies Meta<typeof GameGuideBody>

export default meta
type Story = StoryObj<typeof meta>

export const OnboardingMode: Story = {
  args: {
    mode: "onboarding",
    sport: nflConfig,
  },
}

export const ManualMode: Story = {
  args: {
    mode: "manual",
    sport: nflConfig,
    onOpenCalendar: fn(),
  },
}

export const WithFiveColumns: Story = {
  args: {
    mode: "onboarding",
    sport: nflConfig,
  },
}
