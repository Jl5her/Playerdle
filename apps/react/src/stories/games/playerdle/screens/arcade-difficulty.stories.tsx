import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import ArcadeDifficulty from "@/games/playerdle/screens/arcade-difficulty"

const meta = {
  title: "Playerdle/Screens/ArcadeDifficulty",
  component: ArcadeDifficulty,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative flex flex-col min-h-screen bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
  args: {
    onSelect: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ArcadeDifficulty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSelect: fn(),
    onBack: fn(),
  },
}
