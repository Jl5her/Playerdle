import { ALL_STATES } from "./all-states"

export const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  ALL_STATES.map(s => [s.id, { lat: s.lat, lng: s.lng }]),
)

const toRad = (deg: number) => (deg * Math.PI) / 180

export function bearingDeg(fromId: string, toId: string): number | undefined {
  const a = STATE_CENTROIDS[fromId]
  const b = STATE_CENTROIDS[toId]
  if (!a || !b) return undefined
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const theta = Math.atan2(y, x)
  return ((theta * 180) / Math.PI + 360) % 360
}

export function haversineKm(fromId: string, toId: string): number | undefined {
  const a = STATE_CENTROIDS[fromId]
  const b = STATE_CENTROIDS[toId]
  if (!a || !b) return undefined
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type Warmth = "close" | "warm" | "cool" | "cold"

export function warmthFromKm(km: number): Warmth {
  if (km < 500) return "close"
  if (km < 1200) return "warm"
  if (km < 2400) return "cool"
  return "cold"
}
