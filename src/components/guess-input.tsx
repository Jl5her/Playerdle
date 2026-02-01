import { useState, useRef, useEffect, useMemo } from "react"
import Fuse from "fuse.js"
import { type Player, players, playerId } from "@/data/players"

interface Props {
  onGuess: (player: Player) => void
  guessedIds: Set<string>
  disabled: boolean
}

export default function GuessInput({ onGuess, guessedIds, disabled }: Props) {
  const [query, setQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-focus input on mount and when game resets
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled, guessedIds.size])

  const fuse = useMemo(
    () =>
      new Fuse(players, {
        keys: ["name"],
        threshold: 0.3,
        distance: 50,
      }),
    [],
  )

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    if (!trimmed) return []

    // Normalize: strip apostrophes, periods, and non-alpha chars; lowercase
    const normalize = (s: string) => s.toLowerCase().replace(/['.]/g, "")
    const queryNorm = normalize(trimmed)
    const queryWords = queryNorm.split(/[\s-]+/).filter(Boolean)

    // Token match: every query word must be a prefix of some name word
    const tokenMatches = players.filter(p => {
      if (guessedIds.has(playerId(p))) return false
      const nameWords = normalize(p.name).split(/[\s-]+/)
      return queryWords.every(qw => nameWords.some(nw => nw.startsWith(qw)))
    })

    // Sort token matches by relevance: exact name > fewer extra words > alphabetical
    tokenMatches.sort((a, b) => {
      const aNorm = normalize(a.name)
      const bNorm = normalize(b.name)
      // Exact match first
      const aExact = aNorm === queryNorm ? 0 : 1
      const bExact = bNorm === queryNorm ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      // Fewer name words = closer match
      const aWords = aNorm.split(/[\s-]+/).length
      const bWords = bNorm.split(/[\s-]+/).length
      if (aWords !== bWords) return aWords - bWords
      // Alphabetical tiebreak
      return aNorm.localeCompare(bNorm)
    })

    // Deduplicate by name + position
    const seen = new Set<string>()
    const deduped = tokenMatches.filter(p => {
      const key = `${p.name.toLowerCase()}-${p.position}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Fuzzy fallback for typos — only if token matches are sparse
    if (deduped.length < 5) {
      const tokenIds = new Set(deduped.map(p => playerId(p)))
      const fuzzyResults = fuse
        .search(trimmed, { limit: 15 })
        .filter(r => !guessedIds.has(playerId(r.item)) && !tokenIds.has(playerId(r.item)))
        .sort((a, b) => a.score! - b.score!) // Sort by relevance (lower score = better match)
        .map(r => r.item)

      // Deduplicate fuzzy results as well
      const fuzzyDeduped = fuzzyResults.filter(p => {
        const key = `${p.name.toLowerCase()}-${p.position}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return [...deduped, ...fuzzyDeduped].slice(0, 8)
    }

    return deduped.slice(0, 8)
  }, [trimmed, fuse, guessedIds])

  const duplicateNames = useMemo(() => {
    const dupes = new Set<string>()
    const seen = new Set<string>()
    for (const p of players) {
      if (seen.has(p.name)) dupes.add(p.name)
      else seen.add(p.name)
    }
    return dupes
  }, [])

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[highlightIndex] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightIndex, filtered.length])

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    if (!composingRef.current) {
      setQuery(e.currentTarget.value)
      setShowDropdown(true)
      setHighlightIndex(0) // Auto-select first item
    }
  }

  function selectPlayer(player: Player) {
    onGuess(player)
    setQuery("")
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === "Enter" && filtered.length === 1) {
        selectPlayer(filtered[0])
        e.preventDefault()
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        selectPlayer(filtered[highlightIndex])
      } else if (filtered.length > 0) {
        selectPlayer(filtered[0])
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  if (disabled) {
    return null
  }

  return (
    <div className="shrink-0 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-primary-300 bg-primary-50 dark:bg-primary-900 dark:border-primary-700">
      <div className="relative max-w-xs mx-auto">
        <input
          ref={inputRef}
          type="text"
          name="player-search"
          value={query}
          onInput={handleInput}
          onChange={() => { }}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={e => {
            composingRef.current = false
            setQuery(e.currentTarget.value)
            setShowDropdown(true)
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type a player name..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-primary-300 bg-secondary-50 text-primary-900 outline-none dark:bg-secondary-900 dark:text-primary-50 dark:border-primary-700"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="search"
          data-form-type="other"
        />
        {showDropdown && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto bg-secondary-50 border border-primary-300 rounded-lg mb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-10 dark:bg-secondary-900 dark:border-primary-700"
          >
            {filtered.map((player, i) => (
              <button
                key={`${playerId(player)}-${i}`}
                className={`flex justify-between items-center w-full px-3 py-2 border-none bg-none text-primary-900 text-left cursor-pointer transition-colors dark:text-primary-50 ${i === highlightIndex ? "bg-primary-100 dark:bg-primary-800" : "hover:bg-primary-50 dark:hover:bg-primary-900"}`}
                onMouseDown={e => {
                  e.preventDefault()
                  selectPlayer(player)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <span className="font-semibold text-sm">
                  {player.name}
                  {duplicateNames.has(player.name) && (
                    <span className="text-xs font-normal text-primary-500 dark:text-primary-200"> ({player.position})</span>
                  )}
                </span>
                {i === highlightIndex && (
                  <span className="text-sm text-primary-500 dark:text-primary-200 opacity-60 ml-2 font-normal border border-primary-500 dark:border-primary-200 rounded px-1">↵</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
