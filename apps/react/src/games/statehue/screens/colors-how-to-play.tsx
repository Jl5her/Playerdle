import { faLocationArrow } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getCollegiateTeamPalette } from "@playerdle/data/statehue/collegiate-states"
import { getProTeamPalette } from "@playerdle/data/statehue/states"
import clsx from "clsx"

import type { ColorsVariant } from "@/games/statehue/utils/colors-daily"
import { Panel } from "@/shared/components"

interface Props {
  variant?: ColorsVariant
  open: boolean
  onClose: () => void
  onOpenCalendar?: () => void
}

function MiniDiamond({ color }: { color: string }) {
  const isTransparent = color === "transparent"
  return (
    <span
      className={clsx("inline-block w-5 h-5 rounded-xs rotate-45", isTransparent && "diamond-transparent")}
      style={isTransparent ? { border: "1px solid rgba(0,0,0,0.25)" } : { backgroundColor: color, border: `1px solid rgba(0,0,0,0.25)` }}
      aria-hidden="true"
    />
  )
}

function ExampleRow({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {colors.map((c, i) => (
        <MiniDiamond
          key={`${c}-${i}`}
          color={c}
        />
      ))}
    </div>
  )
}

export default function ColorsHowToPlay({ variant = "pro", open, onClose, onOpenCalendar }: Props) {
  const isLocal = import.meta.env.DEV
  const isCollegiate = variant === "collegiate"

  return (
    <Panel open={open} onClose={onClose} title="How to Play">
      <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
        {isCollegiate
          ? "Guess the U.S. state from the team colors of its D1 college programs. You have 5 guesses."
          : "Guess the U.S. state from the team colors of its professional sports franchises. You have 5 guesses."}
      </p>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          The clue
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          {isCollegiate
            ? "Each puzzle picks three D1 programs from the same state — drawn from the SEC, ACC, Big Ten, Big 12, and more. Each row shows one program's three brand colors. The conference and program name stay hidden until you guess."
            : "Each row shows the three brand colors of one of the state's NFL, MLB, NBA, or NHL teams. The league and team name stay hidden — you have to recognize the colors."}
        </p>

        <div className="mt-3 rounded-lg bg-primary-100/60 dark:bg-primary-800/40 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200 text-center mb-1">
            Example: if the answer is {isCollegiate ? "Indiana" : "California"}
          </div>
          {isCollegiate ? (
            <>
              <ExampleRow colors={getCollegiateTeamPalette("Indiana") ?? ["#990000", "#EEEDEB", "#FFFFFF"]} />
              <ExampleRow colors={getCollegiateTeamPalette("Notre Dame") ?? ["#0C2340", "#C99700", "#AE9142"]} />
              <div className="mt-2 text-[11px] text-primary-500 dark:text-primary-200 text-center italic">
                (Indiana and Notre Dame)
              </div>
            </>
          ) : (
            <>
              <ExampleRow colors={getProTeamPalette("Los Angeles Lakers") ?? ["#552583", "#FDB927", "#FFFFFF"]} />
              <ExampleRow colors={getProTeamPalette("Golden State Warriors") ?? ["#1D428A", "#FFC72C", "#FFFFFF"]} />
              <div className="mt-2 text-[11px] text-primary-500 dark:text-primary-200 text-center italic">
                (Los Angeles Lakers and Golden State Warriors)
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Hints unlock as you go
        </h3>
        <ul className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed space-y-1 list-disc pl-5">
          <li>
            {isCollegiate
              ? "For each wrong answer another program from that state is revealed (up to 3 programs)."
              : "For each wrong answer another team from that state is revealed (up to 3 teams)."}
          </li>
          <li>
            Each wrong guess shows a{" "}
            <FontAwesomeIcon
              icon={faLocationArrow}
              className="text-error-500 dark:text-error-400 inline-block"
            />{" "}
            compass arrow pointing toward the answer.
          </li>
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">Win</h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          Type the state name in the input. Correct in 5 or fewer guesses to keep your streak alive.
          The same daily puzzle is shown to everyone.
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
    </Panel>
  )
}
