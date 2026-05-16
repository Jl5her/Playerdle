import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import Overlay from "@/shared/components/overlay"

const meta = {
  title: "UI/Overlay",
  component: Overlay,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "400px" } },
  },
  argTypes: {
    open: { control: "boolean" },
    className: { control: "text" },
  },
  args: {
    open: true,
    onClose: fn(),
    children: (
      <div className="flex items-center justify-center h-full text-primary-700 dark:text-primary-100 text-lg font-semibold">
        Overlay content goes here
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="relative h-96 w-full bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Overlay>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: { open: true },
}

export const Closed: Story = {
  args: { open: false },
}

export const CustomClass: Story = {
  args: {
    open: true,
    className: "bg-primary-200/80 dark:bg-primary-800/80",
    children: (
      <div className="flex items-center justify-center h-full text-primary-700 dark:text-primary-100 text-lg font-semibold">
        Overlay with custom background class
      </div>
    ),
  },
}
