import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import MenuLinkButton from "@/shared/components/menu-link-button"
import MenuOverlay from "@/shared/components/menu-overlay"

const meta = {
  title: "UI/MenuOverlay",
  component: MenuOverlay,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "400px" } },
  },
  argTypes: {
    open: { control: "boolean" },
    title: { control: "text" },
    closeAriaLabel: { control: "text" },
  },
  args: {
    open: true,
    title: "Menu",
    onClose: fn(),
    children: <p className="text-sm text-primary-700 dark:text-primary-200">Menu content goes here.</p>,
  },
  decorators: [
    (Story) => (
      <div className="relative h-96 w-full bg-primary-50 dark:bg-primary-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: { open: true },
}

export const Closed: Story = {
  args: { open: false },
}

export const WithContent: Story = {
  args: {
    open: true,
    title: "Settings",
    children: (
      <div className="flex flex-col items-center gap-3 mt-6">
        <MenuLinkButton label="How to Play" onClick={fn()} />
        <MenuLinkButton label="Statistics" onClick={fn()} />
        <MenuLinkButton label="Settings" onClick={fn()} />
        <MenuLinkButton label="About" onClick={fn()} />
      </div>
    ),
  },
}
