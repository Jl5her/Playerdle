import { describe, expect, it } from "vitest"
import { classifyError, ERROR_CODES, KnownError } from "./error-codes"

describe("classifyError", () => {
  it("returns the code and hint of a KnownError", () => {
    const result = classifyError(new KnownError(ERROR_CODES.EMPTY_POOL, "No players"))
    expect(result.code).toBe("E101")
    expect(result.hint).toBeTruthy()
  })

  it.each([
    "Failed to fetch dynamically imported module: https://x/assets/game-abc.js",
    "Importing a module script failed.",
    "error loading dynamically imported module",
  ])("classifies chunk load failures: %s", message => {
    expect(classifyError(new Error(message)).code).toBe("E201")
  })

  it("returns no code for unknown errors", () => {
    expect(classifyError(new Error("Cannot read properties of undefined"))).toEqual({})
    expect(classifyError("not an error")).toEqual({})
  })
})
