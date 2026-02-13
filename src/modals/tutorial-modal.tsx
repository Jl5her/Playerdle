import type { SportConfig } from "@/sports"

interface Props {
  onClose: () => void
  sport: SportConfig
}

const tileStyle = {
  width: "clamp(2.5rem, 16vw, 5rem)",
  height: "clamp(2.5rem, 16vw, 5rem)",
}

const textStyle = {
  fontSize: "clamp(0.6rem, 2.8vw, 0.9rem)",
}

export default function TutorialModal({ onClose, sport }: Props) {
  function getExampleBg(status: "correct" | "close" | "incorrect"): string {
    if (status === "correct") return "bg-success-500 dark:bg-success-600"
    if (status === "close") return "bg-warning-500 dark:bg-warning-600"
    return "bg-error-500 dark:bg-error-600"
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-1000 p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-50 dark:bg-primary-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto border-2 border-primary-300 dark:border-primary-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b-2 border-primary-300 dark:border-primary-700">
          <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-50 m-0">How to Play</h2>
          <button
            className="bg-transparent border-none text-primary-500 dark:text-primary-200 text-2xl cursor-pointer p-1 leading-none transition-colors hover:text-primary-900 dark:hover:text-primary-50"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
            Guess the mystery {sport.displayName} player in 6 tries. Each guess reveals clues across the columns shown below.
          </p>

          <p className="text-primary-900 dark:text-primary-200 leading-relaxed my-2">
            Tiles evaluate as exact match, close, or incorrect.
          </p>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-3">Example</h3>
            <div className="flex flex-col items-center">
              <div className="flex gap-1 justify-center mb-1">
                {sport.columns.map(column => (
                  <div
                    key={column.id}
                    className="text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50"
                    style={{ width: "clamp(2.5rem, 16vw, 5rem)" }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
              <div className="flex gap-1 justify-center">
                {sport.columns.map(column => (
                  <div
                    key={column.id}
                    style={tileStyle}
                    className={`flex items-center justify-center font-bold leading-tight p-1 rounded-md border-2 border-primary-300 dark:border-primary-700 cursor-default text-primary-50 ${getExampleBg(column.example.status)}`}
                  >
                    {column.example.topValue ? (
                      <div className="flex flex-col items-center justify-center relative z-10">
                        <span style={{ fontSize: "clamp(0.5rem, 2.2vw, 0.7rem)" }} className="text-center leading-tight">
                          {column.example.topValue}
                        </span>
                        <span style={textStyle} className="text-center leading-tight">
                          {column.example.value}
                          {column.example.arrow ? ` ${column.example.arrow}` : ""}
                        </span>
                      </div>
                    ) : (
                      <span style={textStyle} className="text-center relative z-10">
                        {column.example.value}
                        {column.example.arrow ? ` ${column.example.arrow}` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-3">Color Guide</h3>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm shrink-0 bg-success-500 dark:bg-success-600" />
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Green = Correct match</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm shrink-0 bg-warning-500 dark:bg-warning-600" />
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Yellow = Close value</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm shrink-0 bg-error-500 dark:bg-error-600" />
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Red = Incorrect</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2 text-sm">
              Arrows (↑ ↓) indicate if the mystery player's number is higher or lower.
            </p>
          </div>

          <button
            className="mx-auto mt-8 px-6 py-2.5 min-w-36 bg-accent-500 dark:bg-accent-400 text-primary-50 dark:text-primary-900 border-none rounded-md text-sm font-bold cursor-pointer transition-all block w-fit hover:opacity-90"
            onClick={onClose}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
