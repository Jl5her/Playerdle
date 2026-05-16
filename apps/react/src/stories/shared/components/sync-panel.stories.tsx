import type { Meta, StoryObj } from "@storybook/react-vite"
import SyncPanel from "@/shared/components/sync-panel"

const meta = {
  title: "Shared/SyncPanel",
  component: SyncPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SyncPanel>

export default meta
type Story = StoryObj<typeof meta>

/** No sync code exists in localStorage — shows the "Generate Sync Code" prompt. */
export const NoCode: Story = {
  render: () => {
    localStorage.removeItem("playerdle-sync-passphrase")
    return <SyncPanel />
  },
}

/**
 * A passphrase is seeded in localStorage before render. The component will
 * settle on "expired" once the cloud check returns a 404 (no real cloud in
 * Storybook).
 */
export const Expired: Story = {
  render: () => {
    localStorage.setItem("playerdle-sync-passphrase", "hawk-wolf-bear-deer-fox")
    return <SyncPanel />
  },
}
