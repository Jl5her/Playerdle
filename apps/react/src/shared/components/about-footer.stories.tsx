import type { Meta, StoryObj } from "@storybook/react-vite"
import AboutFooter from "./about-footer"

const meta = {
  title: "Shared/AboutFooter",
  component: AboutFooter,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof AboutFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
