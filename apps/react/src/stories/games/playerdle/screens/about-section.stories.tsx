import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { SportInfo } from "@/games/playerdle/sports"
import AboutSection from "@/games/playerdle/screens/about-section"

const nflInfo: SportInfo = {
  id: "nfl",
  slug: "" as const,
  displayName: "NFL",
  subtitle: "Can you name the NFL player in 6 tries?",
}

const mlbInfo: SportInfo = {
  id: "mlb",
  slug: "mlb",
  displayName: "MLB",
  subtitle: "Can you name the MLB player in 6 tries?",
}

const meta = {
  title: "Playerdle/Screens/AboutSection",
  component: AboutSection,
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "500px" } },
  },
  decorators: [
    (Story) => (
      <div className="relative h-[500px] bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    sport: nflInfo,
    onClose: fn(),
    onOpenSettings: fn(),
  },
} satisfies Meta<typeof AboutSection>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
    sport: nflInfo,
  },
}

export const Closed: Story = {
  args: {
    open: false,
  },
}

export const MLB: Story = {
  args: {
    open: true,
    sport: mlbInfo,
  },
}
