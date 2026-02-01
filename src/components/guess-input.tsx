import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react"
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
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          name="player-search"
          value={query}
          onInput={handleInput}
          onChange={() => {}}
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
          style={styles.input}
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
            style={styles.dropdown}
          >
            {filtered.map((player, i) => (
              <button
                key={`${playerId(player)}-${i}`}
                style={{
                  ...styles.dropdownItem,
                  backgroundColor: i === highlightIndex ? "var(--dropdown-hover)" : "transparent",
                }}
                onMouseDown={e => {
                  e.preventDefault()
                  selectPlayer(player)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <span style={styles.playerName}>
                  {player.name}
                  {duplicateNames.has(player.name) && (
                    <span style={styles.playerMeta}> ({player.position})</span>
                  )}
                </span>
                {i === highlightIndex && <span style={styles.enterHint}>↵</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    flexShrink: 0,
    padding: "0.75rem",
    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
    borderTop: "1px solid var(--border)",
    backgroundColor: "var(--bg)",
  },
  inputWrapper: {
    position: "relative",
    maxWidth: "32rem",
    margin: "0 auto",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "0.5rem",
    border: "2px solid var(--input-border)",
    backgroundColor: "var(--input-bg)",
    color: "var(--text)",
    outline: "none",
  },
  dropdown: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    maxHeight: "12rem",
    overflowY: "auto",
    backgroundColor: "var(--dropdown-bg)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    marginBottom: "0.25rem",
    boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
    zIndex: 10,
  },
  dropdownItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "none",
    background: "none",
    color: "var(--text)",
    textAlign: "left",
    cursor: "pointer",
  },
  playerName: {
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  playerMeta: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: "var(--text-secondary)",
  },
  enterHint: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    opacity: 0.6,
    marginLeft: "0.5rem",
    fontWeight: 400,
    border: "1px solid var(--text-secondary)",
    borderRadius: "0.25rem",
    padding: "0.1rem 0.4rem",
  },
}
