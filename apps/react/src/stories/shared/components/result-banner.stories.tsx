import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import ResultBanner from "@/shared/components/result-banner"

const meta = {
  title: "UI/ResultBanner",
  component: ResultBanner,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    won: { control: "boolean" },
    hideAnswer: { control: "boolean" },
    guessCount: { control: { type: "number", min: 1, max: 8 } },
  },
  args: {
    answer: "Patrick Mahomes",
    guessCount: 3,
    team: "KC",
    position: "QB",
    number: "15",
    onToggleHide: fn(),
  },
} satisfies Meta<typeof ResultBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Won: Story = {
  args: { won: true },
}

export const Lost: Story = {
  args: {
    won: false,
    guessCount: 8,
    lossMessage: "Better luck tomorrow!",
  },
}

export const WonOnFirst: Story = {
  args: { won: true, guessCount: 1 },
}

export const HiddenAnswer: Story = {
  args: { won: true, hideAnswer: true },
}

export const NoExtras: Story = {
  args: {
    won: true,
    answer: "Tom Brady",
    guessCount: 5,
    team: undefined,
    position: undefined,
    number: undefined,
    onToggleHide: undefined,
  },
}
