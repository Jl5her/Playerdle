import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import PlayAgainButton from "@/shared/components/play-again-button"
import ShareButton from "@/shared/components/share-button"

const meta = {
  title: "UI/PlayAgainButton",
  component: PlayAgainButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof PlayAgainButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithShareSibling: Story = {
  render: args => (
    <div className="flex items-center gap-3">
      <PlayAgainButton {...args} />
      <ShareButton
        onClick={fn()}
        copied={false}
      />
    </div>
  ),
}
