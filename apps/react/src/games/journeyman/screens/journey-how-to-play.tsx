import { getLeagueJourneyData } from "@playerdle/data/journeyman/leagues"
import clsx from "clsx"
import type { JourneyLeague } from "@/games/journeyman/utils/journey-daily"

interface Props {
  league: JourneyLeague
  className?: string
  onOpenCalendar?: () => void
}

function MiniDiamond({ color }: { color: string }) {
  const isTransparent = color === "transparent"
  return (
    <span
      className={clsx("inline-block w-5 h-5 rounded-[2px] rotate-45", isTransparent && "diamond-transparent")}
      style={
        isTransparent
          ? { border: "1px solid rgba(0,0,0,0.25)" }
          : { backgroundColor: color, border: `1px solid rgba(0,0,0,0.25)` }
      }
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

interface LeagueExample {
  // Top rung (college or first-team) shown before the team rungs.
  rungs: Array<{ colors: [string, string, string]; label: string }>
  positions: string
  caption: string
}

// Per-league example diamond ladder shown in the How-to-Play overlay. Add an
// entry here when registering a new league in journeyman/leagues.ts.
const LEAGUE_EXAMPLES: Record<JourneyLeague, LeagueExample> = {
  nfl: {
    rungs: [
      { colors: ["#C5050C", "#FFFFFF", "#9B0000"], label: "Wisconsin" },
      { colors: ["#002244", "#69BE28", "#A5ACAF"], label: "Seattle Seahawks" },
      { colors: ["#FB4F14", "#002244", "#FFFFFF"], label: "Denver Broncos" },
      { colors: ["#FFB612", "#000000", "#C60C30"], label: "Pittsburgh Steelers" },
    ],
    positions: "QB, WR, RB, and TE",
    caption: "Example: Russell Wilson (QB) — college on top, then each NFL team oldest to newest.",
  },
  mlb: {
    rungs: [
      { colors: ["#0C2340", "#FA4616", "#FFFFFF"], label: "Detroit Tigers" },
      { colors: ["#002D62", "#EB6E1F", "#F4911E"], label: "Houston Astros" },
      { colors: ["#002D72", "#FF5910", "#FFFFFF"], label: "New York Mets" },
      { colors: ["#002D62", "#EB6E1F", "#F4911E"], label: "Houston Astros" },
    ],
    positions: "every position (SP, RP, IF, OF, C, DH)",
    caption: "Example: Justin Verlander (SP) — each MLB team oldest to newest.",
  },
  nba: {
    rungs: [
      { colors: ["#990000", "#FFCC00", "#FFFFFF"], label: "USC" },
      { colors: ["#CE1141", "#000000", "#A1A1A4"], label: "Toronto Raptors" },
      { colors: ["#000000", "#C4CED4", "#FFFFFF"], label: "San Antonio Spurs" },
      { colors: ["#CE1141", "#000000", "#FFFFFF"], label: "Chicago Bulls" },
    ],
    positions: "G, F, and C",
    caption: "Example: DeMar DeRozan (G) — college on top, then each NBA team oldest to newest.",
  },
  nhl: {
    rungs: [
      { colors: ["#FFB81C", "#000000", "#FFFFFF"], label: "Boston Bruins" },
      { colors: ["#00205B", "#FFFFFF", "#000000"], label: "Toronto Maple Leafs" },
      { colors: ["#FCB514", "#000000", "#CFC493"], label: "Pittsburgh Penguins" },
      { colors: ["#69B3E7", "#010101", "#FFFFFF"], label: "Utah Mammoth" },
    ],
    positions: "every position (C, LW, RW, D, G)",
    caption: "Example: Phil Kessel (RW) — each NHL team oldest to newest.",
  },
}

export default function JourneyHowToPlay({ league, className, onOpenCalendar }: Props) {
  const isLocal = import.meta.env.DEV
  const data = getLeagueJourneyData(league)
  const example = LEAGUE_EXAMPLES[league]
  const teamRequirement = `at least 3 ${data.label} teams`
  const playerType = `${data.label} player`

  return (
    <div className={className}>
      <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
        Guess the {playerType} from the chronological list of teams they've played for. You have 5
        guesses.
      </p>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          The clue
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          The player has played for {teamRequirement}. Each team is shown as three colored diamonds
          — its brand colors — in chronological order, oldest at top.
          {data.hasCollegeRung ? (
            <>
              {" "}
              You start with the player's <span className="font-semibold">college</span> and the
              diamonds for their <span className="font-semibold">first {data.label} team</span>.
            </>
          ) : (
            <>
              {" "}
              You start with the diamonds for their{" "}
              <span className="font-semibold">first {data.label} team</span>.
            </>
          )}{" "}
          Unrevealed teams show as neutral diamonds that flip to color when revealed.
        </p>

        <div className="mt-3 rounded-lg bg-primary-100/60 dark:bg-primary-800/40 px-3 py-3">
          <div className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1 w-fit mx-auto">
            {example.rungs.map((rung, i) => (
              <ExampleRow
                key={`${rung.label}-${i}`}
                colors={rung.colors}
                label={rung.label}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-primary-500 dark:text-primary-200 text-center italic">
            {example.caption}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Who's in the pool
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          Daily answers are pulled from a curated pool of {data.label} players who are{" "}
          <span className="font-semibold">currently active or retired within the last 5 years</span>{" "}
          and have played for {teamRequirement}. Eligible positions:{" "}
          <span className="font-semibold">{example.positions}</span>.
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Hints unlock as you go
        </h3>
        <ul className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed space-y-1 list-disc pl-5">
          {data.hasCollegeRung ? (
            <li>Start: college + first team's diamonds are visible.</li>
          ) : (
            <li>Start: first team's diamonds are visible.</li>
          )}
          <li>For each wrong answer, the next-newer team's diamonds light up.</li>
          <li>The player's current team is the last to be revealed.</li>
          <li>
            The position at the top of the ladder is hidden as{" "}
            <span className="font-semibold">?</span> until you guess a player with the matching
            position.
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
            wrong player, but the same position as the answer.
          </li>
          <li>
            <span className="font-semibold text-error-500 dark:text-error-400">Red</span> — wrong
            player and wrong position.
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
