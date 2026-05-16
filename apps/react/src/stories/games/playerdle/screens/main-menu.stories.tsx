import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { SportColumn, SportConfig, SportInfo } from "@/games/playerdle/sports"
import MainMenu from "@/games/playerdle/screens/main-menu"

const nflInfo: SportInfo = {
  id: "nfl",
  slug: "" as const,
  displayName: "NFL",
  subtitle: "Can you name the NFL player in 6 tries?",
}

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
  title: "Playerdle/Screens/MainMenu",
  component: MainMenu,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="app-viewport flex flex-col bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
  args: {
    onNavigate: fn(),
    sport: nflInfo,
    section: "menu" as const,
    onCloseAbout: fn(),
    guideSport: null,
  },
} satisfies Meta<typeof MainMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Menu: Story = {
  args: {
    section: "menu",
    sport: nflInfo,
    guideSport: null,
  },
}

export const AboutSection: Story = {
  args: {
    section: "about",
    sport: nflInfo,
  },
}

export const HelpSection: Story = {
  args: {
    section: "help",
    sport: nflInfo,
    guideSport: nflConfig,
  },
}

export const StatsSection: Story = {
  args: {
    section: "stats",
    sport: nflInfo,
  },
}

export const SyncSection: Story = {
  args: {
    section: "sync",
    sport: nflInfo,
  },
}
