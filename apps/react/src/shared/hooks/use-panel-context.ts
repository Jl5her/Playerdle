import { createContext, useContext } from "react"

export interface PanelStackApi {
  isOpen: (id: string) => boolean
  pop: () => void
}

export const PanelStackContext = createContext<PanelStackApi | null>(null)

/** Returns null when called outside a PanelStackContext.Provider (e.g. standalone calendar routes). */
export function usePanelContext(): PanelStackApi | null {
  return useContext(PanelStackContext)
}
