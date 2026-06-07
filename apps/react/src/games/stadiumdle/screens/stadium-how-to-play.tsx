import { faLocationArrow } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Panel } from "@/shared/components"
import { usePanelContext } from "@/shared/hooks/use-panel-context"

export const stadiumTutorialSeenKey = "stadiumdle-tutorial-seen"

interface Props {
  id: string
  onOpenCalendar?: () => void
}

export default function StadiumHowToPlay({ id, onOpenCalendar }: Props) {
  const ctx = usePanelContext()
  const isLocal = import.meta.env.DEV

  function handleClose() {
    localStorage.setItem(stadiumTutorialSeenKey, "true")
    ctx?.pop()
  }

  return (
    <Panel open={ctx?.isOpen(id) ?? false} onClose={handleClose} title="How to Play">
      <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
        Guess the U.S. state from the names and capacities of its professional sports stadiums. You
        have 5 guesses.
      </p>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          The clue
        </h3>
        <p className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed">
          Each puzzle shows one stadium from the answer state — its name, seating capacity, and
          league (NFL, MLB, NBA, or NHL). The team name stays hidden until you finish.
        </p>

        <div className="mt-3 rounded-lg bg-primary-100/60 dark:bg-primary-800/40 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-primary-200 text-center mb-2">
            Example: if the answer is Texas
          </div>
          <div className="rounded-xl bg-secondary-50 dark:bg-secondary-900 border border-primary-200 dark:border-primary-700 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-primary-900 dark:text-primary-50 leading-tight">
                  AT&T Stadium
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-300 mt-0.5">
                  Capacity: 80,000
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                NFL
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-primary-700 dark:text-primary-50 mb-2">
          Hints unlock as you go
        </h3>
        <ul className="text-sm text-primary-500 dark:text-primary-200 leading-relaxed space-y-1 list-disc pl-5">
          <li>
            Each wrong answer reveals an additional stadium from the same state (up to 3 stadiums
            total).
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
