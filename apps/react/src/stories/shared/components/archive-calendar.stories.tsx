import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import ArchiveCalendar from "@/shared/components/archive-calendar"

const meta = {
  title: "Shared/ArchiveCalendar",
  component: ArchiveCalendar,
  tags: ["autodocs"],
  args: {
    title: "Archive",
    subtitle: "Past daily puzzles",
    onSelect: fn(),
    epoch: new Date(2025, 0, 1), // Jan 1 2025
    selected: "2026-05-16",
    history: makeHistory(),
    inProgress: new Map(),
  },
} satisfies Meta<typeof ArchiveCalendar>

export default meta
type Story = StoryObj<typeof meta>

function makeHistory(): Map<string, { won: boolean; guesses: number }> {
  const map = new Map<string, { won: boolean; guesses: number }>()
  const today = new Date(2026, 4, 16) // May 16 2026
  for (let i = 1; i <= 20; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    map.set(key, { won: i % 4 !== 0, guesses: (i % 6) + 1 })
  }
  return map
}

function makeInProgress(): Map<string, number> {
  const map = new Map<string, number>()
  map.set("2026-05-13", 3)
  map.set("2026-05-10", 1)
  return map
}

/** Panel mode — embeds inside a fixed-height container instead of the full-screen app shell. */
export const Panel: Story = {
  args: {
    panel: true,
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div className="h-[600px] w-full max-w-md mx-auto border rounded overflow-hidden flex flex-col">
      <ArchiveCalendar {...args} />
    </div>
  ),
}

/** Full-screen with a back arrow — simulates a standalone route screen. */
export const WithOnBack: Story = {
  args: {
    panel: false,
    onBack: fn(),
  },
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "600px" } },
  },
}

/** Full-screen with a close button — simulates the calendar inside an overlay. */
export const WithOnClose: Story = {
  args: {
    panel: false,
    onClose: fn(),
  },
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "600px" } },
  },
}

/** Shows in-progress indicators on dates where a game has been started but not finished. */
export const WithInProgress: Story = {
  args: {
    panel: true,
    inProgress: makeInProgress(),
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div className="h-[600px] w-full max-w-md mx-auto border rounded overflow-hidden flex flex-col">
      <ArchiveCalendar {...args} />
    </div>
  ),
}

/** No history entries — all past cells show no result badge. */
export const EmptyHistory: Story = {
  args: {
    panel: true,
    history: new Map(),
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div className="h-[600px] w-full max-w-md mx-auto border rounded overflow-hidden flex flex-col">
      <ArchiveCalendar {...args} />
    </div>
  ),
}
