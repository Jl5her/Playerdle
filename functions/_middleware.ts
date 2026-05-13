interface OgConfig {
  title: string
  description: string
  image: string
  url: string
}

// Returns null for paths that already match the static index.html defaults
function getOgConfig(origin: string, path: string): OgConfig | null {
  if (path.startsWith("/statehue/collegiate")) {
    return {
      title: "Statehue Collegiate",
      description: "Guess the US state by its college sports team colors. New puzzle every day.",
      image: `${origin}/og-image-statehue-collegiate.svg`,
      url: `${origin}/statehue/collegiate`,
    }
  }
  if (path.startsWith("/statehue")) {
    return {
      title: "Statehue",
      description: "Guess the US state by its sports team colors. New puzzle every day.",
      image: `${origin}/og-image-statehue.svg`,
      url: `${origin}/statehue`,
    }
  }
  if (path.startsWith("/journeyman")) {
    return {
      title: "Journeyman",
      description: "Trace an NFL player's career from team to team. New puzzle every day.",
      image: `${origin}/og-image-journeyman.svg`,
      url: `${origin}/journeyman`,
    }
  }
  if (path.startsWith("/mlb")) {
    return {
      title: "Playerdle MLB",
      description: "Guess today's mystery MLB player from clues. New puzzle every day.",
      image: `${origin}/og-image-mlb.svg`,
      url: `${origin}/mlb`,
    }
  }
  if (path.startsWith("/nhl")) {
    return {
      title: "Playerdle NHL",
      description: "Guess today's mystery NHL player from clues. New puzzle every day.",
      image: `${origin}/og-image-nhl.svg`,
      url: `${origin}/nhl`,
    }
  }
  if (path.startsWith("/nba")) {
    return {
      title: "Playerdle NBA",
      description: "Guess today's mystery NBA player from clues. New puzzle every day.",
      image: `${origin}/og-image-nba.svg`,
      url: `${origin}/nba`,
    }
  }
  // NFL and root paths already match the static index.html — no modification needed
  return null
}

function injectOgTags(html: string, config: OgConfig): string {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${config.description}">`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${config.url}">`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${config.title}">`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${config.description}">`,
    )
    .replace(
      /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${config.image}">`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${config.title}">`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${config.description}">`,
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${config.image}">`,
    )
}

const ASSET_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|json|webmanifest|txt|xml|map)$/

function isCrawler(ua: string): boolean {
  return /bot|crawler|spider|preview|slack|discord|telegram|whatsapp|facebookexternal|twitterbot|linkedinbot|applebot/i.test(
    ua,
  )
}

export async function onRequest(context: {
  request: Request
  next(): Promise<Response>
}): Promise<Response> {
  const url = new URL(context.request.url)

  // Pass static assets through unchanged
  if (ASSET_EXT.test(url.pathname)) {
    return context.next()
  }

  const config = getOgConfig(url.origin, url.pathname)

  // No custom config for this path — serve as-is
  if (!config) {
    return context.next()
  }

  // Skip expensive body parsing for non-crawler requests
  const ua = context.request.headers.get("user-agent") ?? ""
  if (!isCrawler(ua)) {
    return context.next()
  }

  const response = await context.next()

  const contentType = response.headers.get("content-type") ?? ""
  if (!response.ok || !contentType.includes("text/html")) {
    return response
  }

  const html = await response.text()
  const modified = injectOgTags(html, config)

  const headers = new Headers(response.headers)
  headers.set("content-type", "text/html; charset=utf-8")

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

