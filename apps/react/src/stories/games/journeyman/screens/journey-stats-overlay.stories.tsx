import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PanelStackContext, type PanelStackApi } from "@/shared/hooks/use-panel-context"
import JourneyStatsOverlay from "./journey-stats-overlay"

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
  title: "Journeyman/JourneyStatsOverlay",
  component: JourneyStatsOverlay,
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "600px" } },
  },
  args: {
    id: "stats",
    league: "nfl",
  },
} satisfies Meta<typeof JourneyStatsOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const NFL: Story = {
  decorators: [withOpenPanel],
  args: { league: "nfl" },
}

export const MLB: Story = {
  decorators: [withOpenPanel],
  args: { league: "mlb" },
}

export const WithArchiveButton: Story = {
  decorators: [withOpenPanel],
  args: { league: "nfl", onViewArchive: fn() },
}

export const Closed: Story = {
  decorators: [withClosedPanel],
  args: { league: "nfl" },
}
