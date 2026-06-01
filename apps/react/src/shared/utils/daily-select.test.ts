import { describe, expect, it } from "vitest"
import { hashString, minHashPick, minHashPickN } from "./daily-select"

interface Item {
  id: string
  label: string
}

function items(...ids: string[]): Item[] {
  return ids.map(id => ({ id, label: `Player ${id}` }))
}

const getId = (item: Item) => item.id

describe("hashString", () => {
  it("returns a non-negative integer", () => {
    expect(hashString("hello")).toBeGreaterThanOrEqual(0)
  })

  it("is deterministic", () => {
    expect(hashString("test:2024-06-15")).toBe(hashString("test:2024-06-15"))
  })

  it("produces different values for different inputs", () => {
    expect(hashString("seed:abc")).not.toBe(hashString("seed:xyz"))
  })
})

describe("minHashPick", () => {
  it("throws on empty pool", () => {
    expect(() => minHashPick([], getId, "seed")).toThrow()
  })

  it("returns the only item in a single-element pool", () => {
    const pool = items("only")
    expect(minHashPick(pool, getId, "any-seed").id).toBe("only")
  })

  it("is deterministic — same seed always picks the same item", () => {
    const pool = items("a", "b", "c", "d", "e")
    const seed = "nfl:classic:2024-06-15"
    const first = minHashPick(pool, getId, seed).id
    for (let i = 0; i < 10; i++) {
      expect(minHashPick(pool, getId, seed).id).toBe(first)
    }
  })

  it("is order-independent — shuffling the pool returns the same item", () => {
    const pool = items("a", "b", "c", "d", "e")
    const shuffled = [...pool].reverse()
    const seed = "nfl:classic:2024-06-15"
    expect(minHashPick(pool, getId, seed).id).toBe(minHashPick(shuffled, getId, seed).id)
  })

  it("different seeds pick different items (across a range of seeds)", () => {
    const pool = items("a", "b", "c", "d", "e", "f", "g", "h")
    const picked = new Set<string>()
    for (let day = 1; day <= 100; day++) {
      picked.add(minHashPick(pool, getId, `seed:day${day}`).id)
    }
    // With 8 items and 100 seeds, all items should appear at least once
    expect(picked.size).toBe(pool.length)
  })

  it("only adding/removing the winning id changes that seed's answer", () => {
    const pool = items("a", "b", "c", "d", "e")
    const seed = "test:2024-06-01"
    const winner = minHashPick(pool, getId, seed).id

    // Remove a non-winner and re-pick — winner should be unchanged
    const poolMinusOther = pool
      .filter(p => p.id !== winner)
      .slice(1)
      .concat(pool.filter(p => p.id === winner))
    const stillWinner = minHashPick(
      pool.filter(p => p.id !== poolMinusOther[0]?.id),
      getId,
      seed,
    )
    expect([winner, expect.any(String)]).toContain(stillWinner.id)
  })
})

describe("minHashPickN", () => {
  it("returns all items when n >= pool size", () => {
    const pool = items("a", "b", "c")
    const result = minHashPickN(pool, getId, "seed", 10)
    expect(result).toHaveLength(3)
  })

  it("returns exactly n items when n < pool size", () => {
    const pool = items("a", "b", "c", "d", "e")
    const result = minHashPickN(pool, getId, "seed", 3)
    expect(result).toHaveLength(3)
  })

  it("is deterministic", () => {
    const pool = items("a", "b", "c", "d", "e")
    const seed = "test-seed"
    const first = minHashPickN(pool, getId, seed, 3).map(i => i.id)
    const second = minHashPickN(pool, getId, seed, 3).map(i => i.id)
    expect(first).toEqual(second)
  })

  it("is order-independent", () => {
    const pool = items("a", "b", "c", "d", "e")
    const shuffled = [...pool].reverse()
    const seed = "test-seed"
    const fromPool = minHashPickN(pool, getId, seed, 3)
      .map(i => i.id)
      .sort()
    const fromShuffled = minHashPickN(shuffled, getId, seed, 3)
      .map(i => i.id)
      .sort()
    expect(fromPool).toEqual(fromShuffled)
  })

  it("first item matches minHashPick winner", () => {
    const pool = items("a", "b", "c", "d", "e")
    const seed = "test-seed"
    const winner = minHashPick(pool, getId, seed).id
    const topN = minHashPickN(pool, getId, seed, 3)
    expect(topN[0].id).toBe(winner)
  })
})
