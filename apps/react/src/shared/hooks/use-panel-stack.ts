import { useCallback, useState } from "react"

/**
 * Manages an ordered stack of open panel IDs.
 * - push: opens a panel (adds to top); no-op if already on top
 * - pop: closes the top-most panel
 * - clear: closes all panels
 * - isOpen: true if the panel id is anywhere in the stack
 * - isAnyOpen: true if the stack is non-empty
 */
export function usePanelStack<T extends string>(initial?: T) {
  const [stack, setStack] = useState<T[]>(() => (initial !== undefined ? [initial] : []))

  const push = useCallback((id: T) => {
    setStack(prev => (prev[prev.length - 1] === id ? prev : [...prev, id]))
  }, [])

  const pop = useCallback(() => {
    setStack(prev => prev.slice(0, -1))
  }, [])

  const clear = useCallback(() => {
    setStack([])
  }, [])

  function isOpen(id: string): boolean {
    return stack.includes(id as T)
  }

  return { push, pop, clear, isOpen, isAnyOpen: stack.length > 0, stack }
}
