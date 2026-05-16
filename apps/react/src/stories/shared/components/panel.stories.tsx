import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import Panel from "@/shared/components/panel"

const meta = {
  title: "UI/Panel",
  component: Panel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "500px" } },
  },
  argTypes: {
    open: { control: "boolean" },
    layout: {
      control: "select",
      options: [undefined, "scroll", "full"],
    },
    title: { control: "text" },
  },
  args: {
    open: true,
    onClose: fn(),
    title: "How to Play",
    children: (
      <div className="space-y-3 text-sm text-primary-800 dark:text-primary-100">
        <p>Guess the mystery player in 8 tries.</p>
        <p>Each guess must be a valid player name.</p>
        <p>After each guess, tiles show how close your guess was.</p>
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 rounded bg-success-500 flex items-center justify-center text-white text-xs font-bold">
            QB
          </div>
          <span>Green = correct attribute</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 rounded bg-warning-500 flex items-center justify-center text-white text-xs font-bold">
            28
          </div>
          <span>Yellow = close (within range)</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 rounded bg-error-500 flex items-center justify-center text-white text-xs font-bold">
            WR
          </div>
          <span>Red = incorrect</span>
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Closed: Story = {
  args: { open: false },
}

export const ScrollLayout: Story = {
  args: {
    layout: "scroll",
    title: "Statistics",
    children: (
      <div className="space-y-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="p-3 rounded bg-primary-100 dark:bg-primary-800 text-sm">
            Stat row {i + 1}
          </div>
        ))}
      </div>
    ),
  },
}
