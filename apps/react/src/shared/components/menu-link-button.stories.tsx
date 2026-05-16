import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import MenuLinkButton from "./menu-link-button"

const meta = {
  title: "UI/MenuLinkButton",
  component: MenuLinkButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    label: { control: "text" },
    className: { control: "text" },
    title: { control: "text" },
  },
  args: {
    label: "How to Play",
    onClick: fn(),
  },
} satisfies Meta<typeof MenuLinkButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithCustomClass: Story = {
  args: {
    label: "Settings",
    className: "mt-4",
  },
}

export const WithTitle: Story = {
  args: {
    label: "About",
    title: "Learn more about Playerdle",
  },
}
