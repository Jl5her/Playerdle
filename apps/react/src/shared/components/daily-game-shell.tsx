import clsx from "clsx"
import type { ReactNode } from "react"
import { useAutoResults } from "@/shared/hooks/use-auto-results"
import { useResultsKeyboard } from "@/shared/hooks/use-results-keyboard"
import Button from "./button"
import Popup from "./popup"
import ResultsSlidePanel from "./results-slide-panel"

interface ResultsApi {
  onClose: () => void
  onPlayAgain: () => void
}

interface Props {
  gameOver: boolean
  popupMessage?: string
  onPlayAgain?: () => void
  renderResults?: (api: ResultsApi) => ReactNode
  children: ReactNode
}

export default function DailyGameShell({
  gameOver,
  popupMessage,
  onPlayAgain,
  renderResults,
  children,
}: Props) {
  const { showResults, openResults, closeResults, resetForReplay } = useAutoResults(gameOver)

  function handleReplay() {
    onPlayAgain?.()
    resetForReplay()
    closeResults()
  }

  useResultsKeyboard({
    active: showResults,
    onClose: closeResults,
    onPlayAgain: handleReplay,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 overflow-hidden relative">
      {popupMessage !== undefined && (
        <Popup
          visible={gameOver && !showResults && !!popupMessage}
          message={popupMessage}
        />
      )}

      <div
        className={clsx(
          "crossfade-panel h-full min-h-0 overflow-hidden flex flex-col",
          showResults ? "crossfade-inactive" : "crossfade-active",
        )}
      >
        {children}
        {gameOver && (
          <div className="shrink-0 px-3 py-3 bg-primary-50 dark:bg-primary-900 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={openResults}
              variant="primary"
            >
              See Results
            </Button>
          </div>
        )}
      </div>

      <ResultsSlidePanel
        open={showResults}
        onClose={closeResults}
      >
        {renderResults?.({ onClose: closeResults, onPlayAgain: handleReplay })}
      </ResultsSlidePanel>
    </div>
  )
}
