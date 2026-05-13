function mix32(h: number): number {
  let x = h >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x85ebca6b) >>> 0
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35) >>> 0
  x ^= x >>> 16
  return x >>> 0
}

export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return mix32(h >>> 0)
}

// Minimum-hash selection: each candidate gets a hash from (seed + its id), and
// the smallest wins. Result is independent of array order, so reordering the
// pool never shifts past dates; only adding/removing the winning id for a date
// changes that date's answer.
export function minHashPick<T>(items: readonly T[], getId: (item: T) => string, seed: string): T {
  if (items.length === 0) throw new Error("minHashPick: empty pool")
  let bestIdx = 0
  let bestId = getId(items[0])
  let bestHash = hashString(`${seed}:${bestId}`)
  for (let i = 1; i < items.length; i++) {
    const id = getId(items[i])
    const h = hashString(`${seed}:${id}`)
    if (h < bestHash || (h === bestHash && id < bestId)) {
      bestIdx = i
      bestId = id
      bestHash = h
    }
  }
  return items[bestIdx]
}

// Top-N variant: returns the n smallest-hash items, ordered by hash ascending
// (id-tie-break ascending). Order-independent like minHashPick.
export function minHashPickN<T>(
  items: readonly T[],
  getId: (item: T) => string,
  seed: string,
  n: number,
): T[] {
  if (n >= items.length) {
    return [...items].sort((a, b) => {
      const ha = hashString(`${seed}:${getId(a)}`)
      const hb = hashString(`${seed}:${getId(b)}`)
      if (ha !== hb) return ha - hb
      return getId(a) < getId(b) ? -1 : 1
    })
  }
  return items
    .map(item => {
      const id = getId(item)
      return { item, id, hash: hashString(`${seed}:${id}`) }
    })
    .sort((a, b) => (a.hash !== b.hash ? a.hash - b.hash : a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map(x => x.item)
}
