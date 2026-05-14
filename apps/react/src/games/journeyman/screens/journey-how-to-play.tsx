import { getCollegePalette } from "@playerdle/data/journeyman/college-colors"
import { getNflTeamPalette } from "@playerdle/data/journeyman/team-colors"
import clsx from "clsx"

interface Props {
  className?: string
  onOpenCalendar?: () => void
}

function MiniDiamond({ color }: { color: string }) {
  const isTransparent = color === "transparent"
  return (
    <span
      className={clsx("inline-block w-5 h-5 rounded-[2px] rotate-45", isTransparent && "diamond-transparent")}
      style={isTransparent ? { border: "1px solid rgba(0,0,0,0.25)" } : { backgroundColor: color, border: `1px solid rgba(0,0,0,0.25)` }}
      aria-hidden="true"
    />
  )
}

function ExampleRow({
  colors,
  label,
}: {
  colors: [string, string, string]
  label: string
}) {
  return (
    <>
      <div className="flex items-center gap-3 justify-self-end py-1">
        {colors.map((c, i) => (
          <MiniDiamond
            key={`${c}-${i}`}
            color={c}
          />
        ))}
      </div>
      <span className="text-[11px] italic text-primary-500 dark:text-primary-200 py-1">
        {label}
      </span>
    </>
  )
}

export default function JourneyHowToPlay({ className, onOpenCalendar }: Props) {
  const isLocal = import.meta.env.DEV
  return (
    <div className={className}>
      <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
        Guess the NFL player from the chronological list of teams they've played for. You have 5
        guesses.
      </p>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          The clue
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          The player has played for at least 3 NFL teams. Each team is shown as three colored
          diamonds — its brand colors — in chronological order, oldest at top. You start with the
          player's <span className="font-semibold">college</span> and the diamonds for their{" "}
          <span className="font-semibold">first NFL team</span>. Unrevealed teams show as neutral
          diamonds that flip to color when revealed.
        </p>

        <div className="mt-3 rounded-lg bg-primary-100/60 dark:bg-primary-800/40 px-3 py-3">
          <div className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1 w-fit mx-auto">
            <ExampleRow
              colors={getCollegePalette("Wisconsin") ?? ["#C5050C", "#FFFFFF", "transparent"]}
              label="Wisconsin"
            />
            <ExampleRow
              colors={getNflTeamPalette("Seattle Seahawks") ?? ["#002244", "#69BE28", "#A5ACAF"]}
              label="Seattle Seahawks"
            />
            <ExampleRow
              colors={getNflTeamPalette("Denver Broncos") ?? ["#FB4F14", "#002244", "#FFFFFF"]}
              label="Denver Broncos"
            />
            <ExampleRow
              colors={getNflTeamPalette("Pittsburgh Steelers") ?? ["#FFB612", "#000000", "#C60C30"]}
              label="Pittsburgh Steelers"
            />
          </div>
          <p className="mt-3 text-[11px] text-primary-500 dark:text-primary-200 text-center italic">
            Example: Russell Wilson (QB) — college on top, then each NFL team oldest to newest.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Who's in the pool
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          Daily answers are pulled from a curated pool of NFL players who are{" "}
          <span className="font-semibold">currently active or retired within the last 5 years</span>{" "}
          and have played for at least 3 NFL teams. Only{" "}
          <span className="font-semibold">QB, WR, RB, and TE</span> are eligible — same positions as
          Playerdle.
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Hints unlock as you go
        </h3>
        <ul className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed space-y-1 list-disc pl-5">
          <li>Start: college + first team's diamonds are visible.</li>
          <li>For each wrong answer, the next-newer team's diamonds light up.</li>
          <li>The player's current team is the last to be revealed.</li>
          <li>
            The position at the top of the ladder is hidden as{" "}
            <span className="font-semibold">?</span> until you guess a player with the matching
            position group.
          </li>
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Guess colors
        </h3>
        <ul className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed space-y-1 list-disc pl-5">
          <li>
            <span className="font-semibold text-success-500 dark:text-success-400">Green</span> —
            correct player.
          </li>
          <li>
            <span className="font-semibold text-warning-600 dark:text-warning-300">Yellow</span> —
            wrong player, but the same position group as the answer.
          </li>
          <li>
            <span className="font-semibold text-error-500 dark:text-error-400">Red</span> — wrong
            player and wrong position group.
          </li>
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">Win</h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          Type the player's name and submit. Correct in 5 or fewer guesses to keep your streak
          alive. The same daily puzzle is shown to everyone.
        </p>
      </div>

      {isLocal && onOpenCalendar && (
        <div className="mt-6 pt-4 border-t border-primary-300 dark:border-primary-700 text-center">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-bold border-2 border-primary-400 dark:border-primary-500 bg-transparent text-primary-700 dark:text-primary-50 rounded-full cursor-pointer hover:border-primary-600 dark:hover:border-primary-300 transition-colors uppercase"
            onClick={onOpenCalendar}
          >
            Open Calendar
          </button>
          <div className="mt-2 text-[10px] text-primary-400 dark:text-primary-600 uppercase tracking-wider">
            Local only
          </div>
        </div>
      )}
    </div>
  )
}
