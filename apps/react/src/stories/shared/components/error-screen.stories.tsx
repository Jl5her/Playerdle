import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import ErrorScreen, { EXCUSES } from "@/shared/components/error-screen"

const meta = {
  title: "UI/ErrorScreen",
  component: ErrorScreen,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    initialExcuse: { control: { type: "number", min: 0, max: EXCUSES.length - 1 } },
  },
  args: { initialExcuse: 0, onRefresh: fn() },
} satisfies Meta<typeof ErrorScreen>

export default meta
type Story = StoryObj<typeof meta>

/** Unknown error: generic copy plus the Sentry reference */
export const UnknownError: Story = {
  args: { refId: "3f9a1c2e" },
}

/** Known error: code and a specific hint */
export const KnownError: Story = {
  args: {
    code: "E101",
    refId: "3f9a1c2e",
    hint: "Today's roster didn't make it to the stadium. We're on it.",
    initialExcuse: 4,
  },
}

/** Sentry not configured (e.g. local dev without a DSN) */
export const NoReference: Story = {}
