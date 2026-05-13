const EASTERN_TIME_ZONE = "America/New_York"

export function getDateKeyInEasternTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date)
}

export function getTodayKey(): string {
  return getDateKeyInEasternTime(new Date())
}

export function getTodayKeyInEasternTime(): string {
  return getTodayKey()
}
