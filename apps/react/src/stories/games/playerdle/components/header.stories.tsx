import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { SportInfo } from "@/games/playerdle/sports"
import Header from "@/games/playerdle/components/header"

const mockNflSport: SportInfo = {
  id: "nfl",
  slug: "",
  displayName: "NFL",
  subtitle: "Can you name the NFL player in 6 tries?",
}

const mockMlbSport: SportInfo = {
  id: "mlb",
  slug: "mlb",
  displayName: "MLB",
  subtitle: "Can you name the MLB player in 6 tries?",
}

const meta = {
  title: "Playerdle/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="relative h-16 bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
  args: {
    sport: mockNflSport,
    onShowTutorial: fn(),
    onShowStats: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    sport: mockNflSport,
    onShowTutorial: fn(),
    onShowStats: fn(),
    onBack: fn(),
  },
}

export const WithSubtitle: Story = {
  args: {
    sport: mockNflSport,
    subtitle: "Friday, January 3, 2025",
    onShowTutorial: fn(),
    onShowStats: fn(),
    onBack: fn(),
  },
}

export const NoHandlers: Story = {
  args: {
    sport: mockNflSport,
    onShowTutorial: undefined,
    onShowStats: undefined,
    onBack: undefined,
  },
}

export const WithBack: Story = {
  args: {
    sport: mockNflSport,
    onBack: fn(),
    onShowTutorial: undefined,
    onShowStats: undefined,
  },
}

export const DifferentSport: Story = {
  args: {
    sport: mockMlbSport,
    onShowTutorial: fn(),
    onShowStats: fn(),
    onBack: fn(),
  },
}
