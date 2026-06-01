import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PanelStackContext, type PanelStackApi } from "@/shared/hooks/use-panel-context"
import ColorsHowToPlay from "@/games/statehue/screens/colors-how-to-play"

const openContext: PanelStackApi = {
  isOpen: () => true,
  pop: fn(),
}

const closedContext: PanelStackApi = {
  isOpen: () => false,
  pop: fn(),
}

const withOpenPanel: Decorator = Story => (
  <PanelStackContext.Provider value={openContext}>
    <div className="relative h-[600px]">
      <Story />
    </div>
  </PanelStackContext.Provider>
)

const withClosedPanel: Decorator = Story => (
  <PanelStackContext.Provider value={closedContext}>
    <div className="relative h-[600px]">
      <Story />
    </div>
  </PanelStackContext.Provider>
)

const meta = {
  title: "StateHue/ColorsHowToPlay",
  component: ColorsHowToPlay,
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "600px" } },
  },
  args: {
    id: "guide",
    variant: "pro",
    onOpenCalendar: fn(),
  },
} satisfies Meta<typeof ColorsHowToPlay>

export default meta
type Story = StoryObj<typeof meta>

export const Pro: Story = {
  decorators: [withOpenPanel],
  args: { variant: "pro" },
}

export const Collegiate: Story = {
  decorators: [withOpenPanel],
  args: { variant: "collegiate" },
}

export const Closed: Story = {
  decorators: [withClosedPanel],
  args: { variant: "pro" },
}

export const WithCalendarButton: Story = {
  decorators: [withOpenPanel],
  args: { variant: "pro", onOpenCalendar: fn() },
}
