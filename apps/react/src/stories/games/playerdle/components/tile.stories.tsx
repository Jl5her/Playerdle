import type { Meta, StoryObj } from "@storybook/react-vite"
import Tile from "@/games/playerdle/components/tile"

const meta = {
  title: "Playerdle/Tile",
  component: Tile,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    animate: { control: "boolean" },
    delayIndex: { control: { type: "number", min: 0, max: 9 } },
  },
  args: {
    cell: { value: "QB", correct: false },
  },
} satisfies Meta<typeof Tile>

export default meta
type Story = StoryObj<typeof meta>

export const Correct: Story = {
  args: {
    cell: { value: "NFL", correct: true },
  },
}

export const Close: Story = {
  args: {
    cell: { value: "29", correct: false, close: true, arrow: "↑" },
  },
}

export const Wrong: Story = {
  args: {
    cell: { value: "QB", correct: false, close: false },
  },
}

export const WithTooltip: Story = {
  args: {
    cell: {
      value: "QB",
      correct: false,
      close: false,
      tooltip: <span>Wrong position — they play RB.</span>,
    },
  },
}

export const Animated: Story = {
  args: {
    cell: { value: "WR", correct: true },
    animate: true,
    delayIndex: 0,
  },
}

export const Row: Story = {
  render: () => (
    <div className="flex gap-1">
      <Tile cell={{ value: "QB", correct: false }} />
      <Tile cell={{ value: "28", correct: false, close: true, arrow: "↑" }} />
      <Tile cell={{ value: "NFL", correct: true }} />
      <Tile cell={{ value: "NFC", correct: false }} />
      <Tile cell={{ value: "KC", correct: true }} />
    </div>
  ),
}

export const AnimatedRow: Story = {
  render: () => (
    <div className="flex gap-1">
      {["QB", "28", "NFL", "NFC", "KC"].map((value, i) => (
        <Tile
          key={value}
          cell={{ value, correct: i % 2 === 0, close: i === 1, arrow: i === 1 ? "↑" : undefined }}
          animate
          delayIndex={i}
        />
      ))}
    </div>
  ),
}
