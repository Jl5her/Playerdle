import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ColorsStatsBody } from "@/games/statehue/screens/colors-stats-overlay"

const meta = {
  title: "StateHue/ColorsStatsBody",
  component: ColorsStatsBody,
  parameters: {
    layout: "padded",
    docs: { story: { height: "600px" } },
  },
  args: {
    variant: "pro",
  },
} satisfies Meta<typeof ColorsStatsBody>

export default meta
type Story = StoryObj<typeof meta>

export const ProStats: Story = {
  args: { variant: "pro" },
}

export const CollegiateStats: Story = {
  args: { variant: "collegiate" },
}

export const WithArchive: Story = {
  args: { variant: "pro", onViewArchive: fn() },
}
