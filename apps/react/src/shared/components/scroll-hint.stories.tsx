import type { Meta, StoryObj } from "@storybook/react-vite"
import { useRef } from "react"
import ScrollHint from "./scroll-hint"

// A stable fallback ref used only to satisfy the required `scrollRef` arg type.
// Individual stories override rendering entirely via a wrapper component.
const placeholderRef = { current: null }

const meta = {
  title: "Shared/ScrollHint",
  component: ScrollHint,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    scrollRef: placeholderRef,
  },
} satisfies Meta<typeof ScrollHint>

export default meta
type Story = StoryObj<typeof meta>

function ScrollHintDemo({ itemCount }: { itemCount: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <div className="h-64 w-72 relative">
      <div ref={scrollRef} className="h-full overflow-y-auto border rounded p-3">
        {Array.from({ length: itemCount }, (_, i) => (
          <div key={i} className="py-2 border-b text-sm">
            Item {i + 1}
          </div>
        ))}
      </div>
      <ScrollHint scrollRef={scrollRef} />
    </div>
  )
}

export const WithOverflow: Story = {
  render: () => <ScrollHintDemo itemCount={20} />,
}

export const NoOverflow: Story = {
  render: () => <ScrollHintDemo itemCount={2} />,
}
