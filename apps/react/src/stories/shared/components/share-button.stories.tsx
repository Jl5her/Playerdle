import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import ShareButton from "./share-button"

const meta = {
  title: "UI/ShareButton",
  component: ShareButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    copied: { control: "boolean" },
  },
  args: {
    onClick: fn(),
    copied: false,
  },
} satisfies Meta<typeof ShareButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { copied: false },
}

export const Copied: Story = {
  args: { copied: true },
}
