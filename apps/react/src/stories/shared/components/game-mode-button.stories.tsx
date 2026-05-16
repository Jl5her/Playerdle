import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import GameModeButton from "./game-mode-button"

const meta = {
  title: "UI/GameModeButton",
  component: GameModeButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    label: { control: "text" },
    played: { control: "boolean" },
    title: { control: "text" },
  },
  args: {
    label: "NFL",
    played: false,
    onClick: fn(),
  },
} satisfies Meta<typeof GameModeButton>

export default meta
type Story = StoryObj<typeof meta>

export const Unplayed: Story = {
  args: { played: false },
}

export const Completed: Story = {
  args: { played: true },
}

export const WithTitle: Story = {
  args: {
    label: "NBA",
    played: false,
    title: "Play the NBA edition",
  },
}
