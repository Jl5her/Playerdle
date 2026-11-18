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
  { icon: faFootball, title: "Fumble!", line: "We dropped the ball on this one." },
  { icon: faFlag, title: "Flag on the play.", line: "Illegal procedure, offense. That's on us." },
  {
    icon: faFootball,
    title: "Pick-six.",
    line: "A bug jumped the route and took it the other way.",
  },
  { icon: faFootball, title: "Turnover on downs.", line: "We went for it. We should have punted." },
  { icon: faBasketball, title: "Air ball.", line: "Didn't even draw iron." },
  { icon: faBasketball, title: "Posterized.", line: "A bug just dunked on our code." },
  { icon: faBasketball, title: "Technical foul.", line: "Our bench got a little too excited." },
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
  {
    icon: faHockeyPuck,
    title: "Two minutes for roughing.",
    line: "This page is headed to the penalty box.",
  },
  { icon: faHockeyPuck, title: "Icing.", line: "We sent that one the length of the rink." },
  { icon: faHockeyPuck, title: "Own goal.", line: "Banked it in off our own skate." },
]

function randomIndex(exclude?: number): number {
  if (EXCUSES.length < 2) return 0
  let index = Math.floor(Math.random() * EXCUSES.length)
  while (index === exclude) index = Math.floor(Math.random() * EXCUSES.length)
  return index
}

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
  const [excuseIndex, setExcuseIndex] = useState(() => initialExcuse ?? randomIndex())
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
        <div aria-live="polite">
          <h1
            className="text-2xl font-bold"
            id="error-title"
          >
            {excuse.title}
          </h1>
          <p className="mt-1 text-balance text-base text-primary-700 dark:text-primary-200">{excuse.line}</p>
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
        <button
          className="text-xs font-semibold text-primary-500 underline-offset-2 hover:underline dark:text-primary-300"
          onClick={() => setExcuseIndex(current => randomIndex(current))}
          type="button"
        >
          Hear another excuse
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
