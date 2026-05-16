import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import PaletteHub from "./palette-hub"

const withRouter: Decorator = (Story) => (
  <MemoryRouter initialEntries={["/statehue"]}>
    <Story />
  </MemoryRouter>
)

const meta = {
  title: "StateHue/PaletteHub",
  component: PaletteHub,
  decorators: [withRouter],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PaletteHub>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
