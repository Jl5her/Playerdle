import {
  faBaseball,
  faBaseballBatBall,
  faBasketball,
  faFlag,
  faFootball,
  faHockeyPuck,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"

interface Excuse {
  icon: IconDefinition
  title: string
  line: string
}

export const EXCUSES: Excuse[] = [
  // Football
  { icon: faFootball, title: "Fumble!", line: "We dropped the ball on this one." },
  { icon: faFlag, title: "Flag on the play.", line: "Illegal procedure, offense. That's on us." },
  {
    icon: faFootball,
    title: "Pick-six.",
    line: "A bug jumped the route and took it the other way.",
  },
  { icon: faFootball, title: "Turnover on downs.", line: "We went for it. We should have punted." },
  { icon: faFootball, title: "Shanked it.", line: "Wide right. Not even close." },
  { icon: faFlag, title: "Delay of game.", line: "Five-yard penalty. Our servers are huddling." },
  { icon: faFootball, title: "Safety.", line: "Tackled in our own end zone. Two points, bugs." },
  { icon: faFlag, title: "False start.", line: "Something flinched before the snap." },
  { icon: faFootball, title: "Onside kick recovered.", line: "By the other team. Of course." },
  { icon: faFootball, title: "Blocked punt.", line: "Nobody picked up the rusher." },
  // Basketball
  { icon: faBasketball, title: "Air ball.", line: "Didn't even draw iron." },
  { icon: faBasketball, title: "Posterized.", line: "A bug just dunked on our code." },
  { icon: faBasketball, title: "Technical foul.", line: "Our bench got a little too excited." },
  {
    icon: faBasketball,
    title: "Shot clock violation.",
    line: "We held it too long and forgot to shoot.",
  },
  { icon: faBasketball, title: "Traveling.", line: "Took one too many steps on that request." },
  { icon: faBasketball, title: "Brick.", line: "Off the backboard, off the rim, out of bounds." },
  { icon: faBasketball, title: "Goaltending.", line: "Got there a little too late on that one." },
  {
    icon: faBasketball,
    title: "Double dribble.",
    line: "Our code picked it up and put it back down.",
  },
  // Baseball
  { icon: faBaseball, title: "Swing and a miss.", line: "Strike three. Back to the dugout." },
  {
    icon: faBaseballBatBall,
    title: "Rain delay.",
    line: "The tarp is on the field while we sort this out.",
  },
  {
    icon: faBaseball,
    title: "E-6.",
    line: "Routine grounder, right through the shortstop's legs.",
  },
  { icon: faBaseball, title: "Balk!", line: "Our pitcher flinched. Everybody advances." },
  {
    icon: faBaseballBatBall,
    title: "Infield fly rule.",
    line: "Nobody fully understands this one either.",
  },
  { icon: faBaseball, title: "Wild pitch.", line: "That one sailed to the backstop." },
  { icon: faBaseballBatBall, title: "Caught looking.", line: "Didn't even swing at it." },
  {
    icon: faBaseball,
    title: "Pitching change.",
    line: "We're going to the bullpen. Give us a minute.",
  },
  // Hockey
  {
    icon: faHockeyPuck,
    title: "Two minutes for roughing.",
    line: "This page is headed to the penalty box.",
  },
  { icon: faHockeyPuck, title: "Icing.", line: "We sent that one the length of the rink." },
  { icon: faHockeyPuck, title: "Own goal.", line: "Banked it in off our own skate." },
  { icon: faHockeyPuck, title: "Offside.", line: "Crossed the blue line before the puck did." },
  {
    icon: faHockeyPuck,
    title: "Too many men on the ice.",
    line: "Bench minor. Someone can't count.",
  },
  { icon: faHockeyPuck, title: "Puck over the glass.", line: "Delay of game. Off to the box." },
  { icon: faHockeyPuck, title: "Zamboni break.", line: "Resurfacing the ice. Back shortly." },
]

export interface ErrorScreenProps {
  /** Known-error code (e.g. "E101"), shown so players can report it */
  code?: string
  /** Short Sentry reference for unknown errors */
  refId?: string
  /** Advice specific to a known error */
  hint?: string
  /** Starting excuse (random when omitted) */
  initialExcuse?: number
  onRefresh?: () => void
}

/** Player-facing crash screen. Never shows the raw error message. */
export default function ErrorScreen({
  code,
  refId,
  hint,
  initialExcuse,
  onRefresh = () => window.location.reload(),
}: ErrorScreenProps) {
  // Picked once per crash; stays put for the life of the screen
  const [excuseIndex] = useState(() => initialExcuse ?? Math.floor(Math.random() * EXCUSES.length))
  const excuse = EXCUSES[excuseIndex % EXCUSES.length]

  return (
    <main className="min-h-dvh w-full overflow-y-auto bg-primary-50 px-4 py-8 text-center text-primary-900 dark:bg-primary-900 dark:text-primary-50">
      <section
        aria-labelledby="error-title"
        className="mx-auto flex min-h-[60dvh] w-full max-w-sm flex-col items-center justify-center gap-4"
        role="alert"
      >
        <FontAwesomeIcon
          aria-hidden="true"
          className="text-5xl text-primary-500 dark:text-primary-300"
          icon={excuse.icon}
        />
        <div>
          <h1
            className="text-2xl font-bold"
            id="error-title"
          >
            {excuse.title}
          </h1>
          <p className="mt-1 text-balance text-base text-primary-700 dark:text-primary-200">
            {excuse.line}
          </p>
        </div>
        <p className="text-balance text-sm text-primary-600 dark:text-primary-300">
          {hint ?? "Something went wrong on our end. A refresh usually gets you back in the game."}
        </p>
        <button
          className="rounded bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:bg-primary-200 dark:text-primary-900 dark:hover:bg-primary-100"
          onClick={onRefresh}
          type="button"
        >
          Refresh page
        </button>
        {(code || refId) && (
          <p className="mt-2 text-xs text-primary-500 dark:text-primary-400">
            {code && (
              <>
                Error code <code className="select-all font-mono font-semibold">{code}</code>
              </>
            )}
            {code && refId && " · "}
            {refId && (
              <>
                Ref <code className="select-all font-mono">{refId}</code>
              </>
            )}
          </p>
        )}
      </section>
    </main>
  )
}
