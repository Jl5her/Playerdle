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

export function minHashPick<T>(
  items: readonly T[],
  getId: (item: T) => string,
  seed: string,
): T {
  if (items.length === 0) throw new Error("minHashPick: empty pool")
  let bestIdx = 0
  let bestId = getId(items[0]!)
  let bestHash = hashString(`${seed}:${bestId}`)
  for (let i = 1; i < items.length; i++) {
    const id = getId(items[i]!)
    const h = hashString(`${seed}:${id}`)
    if (h < bestHash || (h === bestHash && id < bestId)) {
      bestIdx = i
      bestId = id
      bestHash = h
    }
  }
  return items[bestIdx]!
}
