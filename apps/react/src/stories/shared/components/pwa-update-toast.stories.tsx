import type { Meta, StoryObj } from "@storybook/react-vite"
import PWAUpdateToast from "./pwa-update-toast"
import Popup from "./popup"

const meta = {
  title: "Shared/PWAUpdateToast",
  component: PWAUpdateToast,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Listens for service worker `controllerchange` events and shows a toast when the app updates. In Storybook no SW events fire, so this component renders nothing — see the **ToastPreview** story to see the underlying Popup.",
      },
    },
  },
} satisfies Meta<typeof PWAUpdateToast>

export default meta
type Story = StoryObj<typeof meta>

/** Component renders null in Storybook (no service worker). */
export const Default: Story = {}

/** Shows the underlying Popup in its visible state for visual review. */
export const ToastPreview: Story = {
  render: () => (
    <div className="relative h-20">
      <Popup
        visible
        message="Updated to latest version"
        durationMs={30000}
      />
    </div>
  ),
}
