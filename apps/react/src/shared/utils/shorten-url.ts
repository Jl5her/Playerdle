export async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(20_000) }
    )
    if (!res.ok) return url
    const short = (await res.text()).trim()
    return short.startsWith("https://is.gd/") || short.startsWith("http://is.gd/") ? short : url
  } catch {
    return url
  }
}
