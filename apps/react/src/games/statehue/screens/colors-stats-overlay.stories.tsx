import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PanelStackContext, type PanelStackApi } from "@/shared/hooks/use-panel-context"
import ColorsStatsOverlay from "./colors-stats-overlay"

const openContext: PanelStackApi = {
  isOpen: () => true,
  pop: fn(),
}

const closedContext: PanelStackApi = {
  isOpen: () => false,
  pop: fn(),
}

const withOpenPanel: Decorator = (Story) => (
  <PanelStackContext.Provider value={openContext}>
    <div className="relative h-[600px]">
      <Story />
    </div>
  </PanelStackContext.Provider>
)

const withClosedPanel: Decorator = (Story) => (
  <PanelStackContext.Provider value={closedContext}>
    <div className="relative h-[600px]">
      <Story />
    </div>
  </PanelStackContext.Provider>
)

const meta = {
  title: "StateHue/ColorsStatsOverlay",
  component: ColorsStatsOverlay,
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "600px" } },
  },
  args: {
    id: "stats",
    variant: "pro",
  },
} satisfies Meta<typeof ColorsStatsOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const ProOverlayOpen: Story = {
  decorators: [withOpenPanel],
  args: { variant: "pro" },
}

export const CollegiateOverlayOpen: Story = {
  decorators: [withOpenPanel],
  args: { variant: "collegiate" },
}

export const Closed: Story = {
  decorators: [withClosedPanel],
  args: { variant: "pro" },
}
