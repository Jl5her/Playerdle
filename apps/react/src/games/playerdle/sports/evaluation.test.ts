import { describe, expect, it } from "vitest"
import { evaluateColumn } from "./evaluation"
import type { Player, SportColumn } from "./types"

function makePlayer(fields: Record<string, string | number | null | undefined>): Player {
  return { id: "p1", name: "Test Player", ...fields }
}

function makeColumn(
  key: string,
  evaluator: SportColumn["evaluator"],
): SportColumn {
  return {
    id: key,
    label: key,
    key,
    evaluator,
    example: { value: "", status: "correct" },
  }
}

describe("evaluateColumn — match evaluator", () => {
  const col = makeColumn("team", { type: "match" })

  it("returns correct when values are equal", () => {
    const result = evaluateColumn(
      makePlayer({ team: "Cowboys" }),
      makePlayer({ team: "Cowboys" }),
      col,
    )
    expect(result.status).toBe("correct")
    expect(result.value).toBe("Cowboys")
  })

  it("returns incorrect when values differ", () => {
    const result = evaluateColumn(
      makePlayer({ team: "Cowboys" }),
      makePlayer({ team: "Eagles" }),
      col,
    )
    expect(result.status).toBe("incorrect")
  })

  it("returns incorrect for null vs non-null", () => {
    const result = evaluateColumn(
      makePlayer({ team: null }),
      makePlayer({ team: "Eagles" }),
      col,
    )
    expect(result.status).toBe("incorrect")
    expect(result.value).toBe("")
  })
})

describe("evaluateColumn — mismatch evaluator", () => {
  const col = makeColumn("draftedBy", { type: "mismatch" })

  it("returns correct when values differ", () => {
    const result = evaluateColumn(
      makePlayer({ draftedBy: "Cowboys" }),
      makePlayer({ draftedBy: "Eagles" }),
      col,
    )
    expect(result.status).toBe("correct")
  })

  it("returns incorrect when values are equal", () => {
    const result = evaluateColumn(
      makePlayer({ draftedBy: "Cowboys" }),
      makePlayer({ draftedBy: "Cowboys" }),
      col,
    )
    expect(result.status).toBe("incorrect")
  })
})

describe("evaluateColumn — comparison evaluator", () => {
  const col = makeColumn("age", { type: "comparison", closeWithin: 2, showDirection: true })

  it("returns correct when values are equal", () => {
    const result = evaluateColumn(
      makePlayer({ age: 28 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.status).toBe("correct")
    expect(result.arrow).toBeUndefined()
  })

  it("returns close when within threshold", () => {
    const result = evaluateColumn(
      makePlayer({ age: 26 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.status).toBe("close")
  })

  it("returns close exactly at threshold boundary", () => {
    const result = evaluateColumn(
      makePlayer({ age: 30 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.status).toBe("close")
  })

  it("returns incorrect when beyond threshold", () => {
    const result = evaluateColumn(
      makePlayer({ age: 25 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.status).toBe("incorrect")
  })

  it("shows up arrow when guess is below answer", () => {
    const result = evaluateColumn(
      makePlayer({ age: 25 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.arrow).toBe("↑")
  })

  it("shows down arrow when guess is above answer", () => {
    const result = evaluateColumn(
      makePlayer({ age: 31 }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.arrow).toBe("↓")
  })

  it("returns incorrect and no arrow for non-numeric values", () => {
    const result = evaluateColumn(
      makePlayer({ age: "N/A" }),
      makePlayer({ age: 28 }),
      col,
    )
    expect(result.status).toBe("incorrect")
    expect(result.arrow).toBeUndefined()
  })

  it("omits arrow when showDirection is false", () => {
    const noArrowCol = makeColumn("age", { type: "comparison", closeWithin: 2, showDirection: false })
    const result = evaluateColumn(
      makePlayer({ age: 25 }),
      makePlayer({ age: 28 }),
      noArrowCol,
    )
    expect(result.arrow).toBeUndefined()
  })
})
