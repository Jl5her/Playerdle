import type { Meta, StoryObj } from "@storybook/react-vite"
import Popup from "@/shared/components/popup"

const meta = {
  title: "UI/Popup",
  component: Popup,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "200px" } },
  },
  argTypes: {
    visible: { control: "boolean" },
    message: { control: "text" },
    durationMs: { control: { type: "number", min: 500, max: 30000, step: 500 } },
  },
  decorators: [
    (Story) => (
      <div className="relative h-48 w-full bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popup>

export default meta
type Story = StoryObj<typeof meta>

// The Popup component triggers display on a false→true transition of `visible`.
// Using a render function with a key forces remount so visible=true is seen as
// the initial transition and the toast appears immediately.
export const Visible: Story = {
  args: {
    visible: true,
    message: "Game over! Better luck tomorrow",
    durationMs: 30000,
  },
  render: (args) => <Popup key={String(args.visible) + args.message} {...args} />,
}

export const Hidden: Story = {
  args: {
    visible: false,
    message: "Game over! Better luck tomorrow",
  },
}

export const LongMessage: Story = {
  args: {
    visible: true,
    message:
      "Congratulations! You guessed the player correctly in just 2 tries. Amazing work — come back tomorrow for a new challenge!",
    durationMs: 30000,
  },
  render: (args) => <Popup key={String(args.visible) + args.message} {...args} />,
}

export const CustomDuration: Story = {
  args: {
    visible: true,
    message: "This popup disappears after 2 seconds",
    durationMs: 2000,
  },
  render: (args) => <Popup key={String(args.visible) + args.message} {...args} />,
}
