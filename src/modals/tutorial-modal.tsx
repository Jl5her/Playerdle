interface Props {
  onClose: () => void
}

export default function TutorialModal({ onClose }: Props) {
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
          <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">Guess the mystery NFL player in 6 tries.</p>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-3">How It Works</h3>
            <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
              Each guess reveals clues about the player's conference, division, team, position, and
              jersey number.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-3">Color Guide</h3>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-20 h-15 rounded border-2 border-primary-300 dark:border-primary-700 shrink-0 bg-success-500 dark:bg-success-400"
                >
                  <span className="text-primary-50 dark:text-primary-900 font-bold text-sm relative z-10">NFC</span>
                </div>
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Green = Correct match</p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-20 h-15 rounded border-2 border-primary-300 dark:border-primary-700 shrink-0 bg-warning-500 dark:bg-warning-400"
                >
                  <span className="text-primary-50 dark:text-primary-900 font-bold text-sm relative z-10">15 ↑</span>
                </div>
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Yellow = Number within 5</p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-20 h-15 rounded border-2 border-primary-300 dark:border-primary-700 shrink-0 bg-error-500 dark:bg-error-400"
                >
                  <span className="text-primary-50 dark:text-primary-900 font-bold text-sm relative z-10">QB</span>
                </div>
                <p className="text-primary-900 dark:text-primary-50 m-0 text-sm">Red = Incorrect</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-primary-500 dark:text-primary-200 leading-relaxed my-2">
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
