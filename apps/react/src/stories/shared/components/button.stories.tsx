import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import Button from "@/shared/components/button"

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "accent"],
    },
    fullWidth: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    onClick: fn(),
    children: "Click Me",
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: "primary" },
}

export const Secondary: Story = {
  args: { variant: "secondary" },
}

export const Accent: Story = {
  args: { variant: "accent" },
}

export const FullWidth: Story = {
  args: { fullWidth: true, children: "Full Width Button" },
  parameters: { layout: "padded" },
}

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 p-4">
      <Button {...args} variant="primary">Primary</Button>
      <Button {...args} variant="secondary">Secondary</Button>
      <Button {...args} variant="accent">Accent</Button>
    </div>
  ),
}
