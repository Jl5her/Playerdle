import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type { SportConfig, SportInfo } from "@/sports"

interface Props {
  sport: SportInfo | SportConfig
  onClose: () => void
}

export default function AboutSection({ sport, onClose }: Props) {
  const commitShortSha = __BUILD_COMMIT_SHORT_SHA__
  const commitUrl = __BUILD_COMMIT_URL__
  const repoUrl = "https://github.com/Jl5her/Playerdle"
  const footerLinkClasses =
    "inline-flex items-center underline decoration-primary-500 underline-offset-4 text-primary-700 dark:text-primary-100 md:hover:text-primary-900 dark:md:hover:text-primary-50 md:hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-primary-900 rounded-sm transition-all duration-150"

  return (
    <div className="w-full max-w-sm mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
          About
        </h2>
        <button
          type="button"
          className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
          aria-label="Close About"
          onClick={onClose}
        >
          <FontAwesomeIcon
            icon={faXmark}
            className="text-2xl"
          />
        </button>
      </div>
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

        <div className="mt-auto pt-6 text-center">
          <p className="text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
            Author
          </p>
          <p className="mt-1 text-sm">
            <a
              className={footerLinkClasses}
              href="https://jackp.me"
              target="_blank"
              rel="noreferrer"
            >
              Jack Pfeiffer
            </a>
          </p>

          <p className="mt-4 text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
            Commit
          </p>
          <p className="mt-1 text-sm">
            {commitShortSha ? (
              commitUrl ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClasses}
                >
                  {commitShortSha}
                </a>
              ) : (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClasses}
                >
                  {commitShortSha}
                </a>
              )
            ) : (
              <span className="text-primary-500 dark:text-primary-300">Unavailable</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
