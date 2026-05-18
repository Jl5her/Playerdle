import { AboutFooter, MenuOverlay } from "@/shared/components"
import type { SportConfig, SportInfo } from "@/games/playerdle/sports"

interface Props {
  open: boolean
  sport: SportInfo | SportConfig
  onClose: () => void
}

export default function AboutSection({ open, sport, onClose }: Props) {
  return (
    <MenuOverlay
      open={open}
      title="About"
      onClose={onClose}
      closeAriaLabel="Close About"
    >
      <div className="-mt-1 flex-1 overflow-auto pb-2 flex flex-col">
        <div>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-3">
            <strong>Playerdle</strong> is a daily guessing game for sports fans. You are currently
            playing the {sport.displayName} version.
          </p>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
            Test your knowledge by identifying players based on their conference, division, team,
            position, and jersey number.
          </p>
          <p className="text-sm text-primary-600 dark:text-primary-200 leading-6 mt-2">
            Inspired by Wordle and other sports guessing games.
          </p>
        </div>
        <AboutFooter />
      </div>
    </MenuOverlay>
  )
}
