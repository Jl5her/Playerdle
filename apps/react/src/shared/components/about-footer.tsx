function FooterLink({
  href,
  children,
  ...props
}: {
  href: string
  children: React.ReactNode
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className="inline-flex items-center underline decoration-primary-500 underline-offset-4 text-primary-700 dark:text-primary-100 md:hover:text-primary-900 dark:md:hover:text-primary-50 md:hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-50 dark:focus-visible:ring-offset-primary-900 rounded-sm transition-all duration-150"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  )
}

export default function AboutFooter() {
  const commitShortSha = __BUILD_COMMIT_SHORT_SHA__
  const commitUrl = __BUILD_COMMIT_URL__
  const repoUrl = "https://github.com/Jl5her/Playerdle"

  return (
    <div className="mt-auto pt-6 text-center">
      <p className="text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
        Author
      </p>
      <p className="mt-1 text-sm">
        <FooterLink href="https://jackp.me">Jack Pfeiffer</FooterLink>
      </p>

      <p className="mt-4 text-xs uppercase tracking-wide font-semibold text-primary-500 dark:text-primary-300">
        Commit
      </p>
      <p className="mt-1 text-sm">
        {commitShortSha ? (
          <FooterLink href={commitUrl ?? repoUrl}>{commitShortSha}</FooterLink>
        ) : (
          <span className="text-primary-500 dark:text-primary-300">Unavailable</span>
        )}
      </p>
    </div>
  )
}
