export default function AboutFooter() {
  const commitShortSha = __BUILD_COMMIT_SHORT_SHA__
  const commitUrl = __BUILD_COMMIT_URL__
  const repoUrl = "https://github.com/Jl5her/Playerdle"
  const footerLinkClasses =
    "inline-flex items-center underline decoration-primary-500 underline-offset-4 text-primary-700 dark:text-primary-100 md:hover:text-primary-900 dark:md:hover:text-primary-50 md:hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-primary-900 rounded-sm transition-all duration-150"

  return (
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
          <a
            href={commitUrl ?? repoUrl}
            target="_blank"
            rel="noreferrer"
            className={footerLinkClasses}
          >
            {commitShortSha}
          </a>
        ) : (
          <span className="text-primary-500 dark:text-primary-300">Unavailable</span>
        )}
      </p>
    </div>
  )
}
