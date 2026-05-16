import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import DailyGameShell from "@/shared/components/daily-game-shell"

const GamePlaceholder = () => (
  <div className="flex-1 flex items-center justify-center text-primary-400 dark:text-primary-600 text-sm font-medium select-none">
    Game in progress…
  </div>
)

const meta = {
  title: "Shared/DailyGameShell",
  component: DailyGameShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { height: "500px" } },
  },
  args: {
    gameOver: false,
    onPlayAgain: fn(),
    onBackToToday: fn(),
    children: <GamePlaceholder />,
  },
} satisfies Meta<typeof DailyGameShell>

export default meta
type Story = StoryObj<typeof meta>

/** Active game — no bottom bar, results panel is closed. */
export const Active: Story = {
  args: {
    gameOver: false,
  },
}

/** Daily game over — shows "See Results" button at the bottom. */
export const GameOver: Story = {
  args: {
    gameOver: true,
    isArcade: false,
    popupMessage: "Patrick Mahomes",
  },
}

/** Arcade game over — shows "Play Again" and "Back to Today's" buttons. */
export const ArcadeGameOver: Story = {
  args: {
    gameOver: true,
    isArcade: true,
  },
}

/** Game over with a results renderer — opens the results panel automatically. */
export const WithResults: Story = {
  args: {
    gameOver: true,
    isArcade: false,
    renderResults: ({ onClose, onPlayAgain }) => (
      <div className="flex flex-col gap-4 p-6 items-center">
        <p className="text-xl font-black tracking-wide text-primary-900 dark:text-primary-50">
          You got it in 3!
        </p>
        <p className="text-sm text-primary-600 dark:text-primary-300">
          The answer was Patrick Mahomes
        </p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onPlayAgain}
            className="px-5 py-2 rounded-md font-bold text-sm bg-primary-700 text-primary-50 hover:bg-primary-600 dark:bg-primary-50 dark:text-primary-900 dark:hover:bg-primary-200 transition-colors"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md font-bold text-sm border-2 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-50 hover:border-primary-600 dark:hover:border-primary-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    ),
  },
}
