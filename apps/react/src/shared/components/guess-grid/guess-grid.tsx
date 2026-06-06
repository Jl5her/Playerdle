import clsx from "clsx"
import { type ReactNode, useEffect, useRef } from "react"
import GuessTile from "./guess-tile"
import type { GuessGridRow } from "./types"

interface Props {
  /** Column header labels (one per column). */
  headers: ReactNode[]
  /** Optional per-column hover tooltips (parallel to `headers`). */
  headerTooltips?: (ReactNode | undefined)[]
  /** Filled guess rows, in order. Slots past `rows.length` render empty. */
  rows: GuessGridRow[]
  /** Total number of row slots (filled + empty). */
  maxRows: number
  /** Number of columns; drives empty cells and compact sizing. */
  columnCount: number
  /** Index of the most recent row — it animates and scrolls into view. */
  latestIndex?: number
  /** Force compact cell sizing. Defaults to `columnCount > 5` (Playerdle rule). */
  compact?: boolean
  /** Optional content rendered below the grid (e.g. footnotes). */
  footer?: ReactNode
  className?: string
}

/**
 * Shared guess grid used by Playerdle (classic + variants like Fanatic) and the
 * Rated games. Renders a sticky header row, the filled guess rows, and empty
 * placeholder rows, all with identical cells, colors and text layout.
 */
export default function GuessGrid({
  headers,
  headerTooltips,
  rows,
  maxRows,
  columnCount,
  latestIndex = -1,
  compact,
  footer,
  className,
}: Props) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const isCompact = compact ?? columnCount > 5

  useEffect(() => {
    if (latestIndex < 0) return
    rowRefs.current[latestIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [latestIndex])

  return (
    <div
      className={clsx(
        "guess-grid-shell flex flex-col items-center gap-1 px-2 pt-1 pb-1",
        isCompact && "guess-grid-compact",
        className,
      )}
    >
      <div className="guess-grid-header sticky top-0 z-20 flex gap-1 justify-center py-1 bg-primary-50 dark:bg-primary-900">
        {headers.map((header, i) => {
          const tooltip = headerTooltips?.[i]
          return (
            <div
              key={i}
              className={clsx(
                "group relative grid-cell-width text-center text-xs font-bold tracking-wide uppercase text-primary-900 dark:text-primary-50",
                tooltip && "cursor-help",
              )}
              tabIndex={tooltip ? 0 : undefined}
            >
              {header}
              {tooltip && (
                <div
                  role="tooltip"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block group-focus-within:block z-50 pointer-events-none whitespace-normal w-max max-w-44 rounded-md bg-primary-50 dark:bg-primary-50 text-primary-900 dark:text-primary-900 border border-primary-300 dark:border-primary-400 text-xs font-normal normal-case tracking-normal leading-snug px-2 py-1.5 shadow-lg text-center"
                >
                  {tooltip}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {Array.from({ length: maxRows }).map((_, i) => {
        const row = rows[i]
        if (row) {
          return (
            <div
              key={`row-${row.id}`}
              ref={el => {
                rowRefs.current[i] = el
              }}
              className={clsx(
                row.muted && "blur select-none opacity-40 transition-[filter,opacity] duration-200",
              )}
            >
              {row.label !== undefined && (
                <div className="px-2 py-1 text-xs font-bold text-center uppercase tracking-wider text-primary-700 dark:text-primary-200 leading-none">
                  {row.label}
                </div>
              )}
              <div className="flex gap-1 justify-center">
                {row.cells.map((cell, ci) => (
                  <GuessTile
                    key={ci}
                    cell={cell}
                    animate={i === latestIndex}
                    delayIndex={ci}
                  />
                ))}
              </div>
            </div>
          )
        }
        return (
          <div
            key={`empty-${i}`}
            ref={el => {
              rowRefs.current[i] = el
            }}
          >
            <div className="flex gap-1 justify-center">
              {Array.from({ length: columnCount }).map((_, ci) => (
                <div
                  key={ci}
                  className="grid-cell-size rounded-md bg-primary-50 border border-primary-200 dark:bg-primary-900 dark:border-primary-600"
                />
              ))}
            </div>
          </div>
        )
      })}

      {footer}
    </div>
  )
}
