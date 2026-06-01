import { useCallback, useEffect, useMemo, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Pressable, ScrollView, Text, View } from "@/tw"
import { GuessGrid } from "@/components/guess-grid"
import { GuessInput } from "@/components/guess-input"
import { minHashPick, pickRandom } from "@/lib/daily-select"
import { getTodayKey } from "@/lib/date"
import { nfl } from "@/lib/nfl"
import type { Player } from "@/lib/sport"

const MAX_GUESSES = 6

type Mode = "daily" | "arcade"

interface SavedState {
  date: string
  guessIds: string[]
}

function dailyAnswerFor(dateKey: string): Player {
  return minHashPick(nfl.answerPool, p => p.id, `nfl:classic:${dateKey}`)
}

function dailyStorageKey(dateKey: string) {
  return `playerdle-expo:daily:nfl:${dateKey}`
}

export function GameScreen({ mode }: { mode: Mode }) {
  const todayKey = getTodayKey()
  const [answer, setAnswer] = useState<Player>(() =>
    mode === "daily" ? dailyAnswerFor(todayKey) : pickRandom(nfl.answerPool, p => p.id),
  )
  const [guesses, setGuesses] = useState<Player[]>([])
  const [hydrated, setHydrated] = useState(mode !== "daily")

  useEffect(() => {
    if (mode !== "daily") return
    let cancelled = false
    AsyncStorage.getItem(dailyStorageKey(todayKey)).then(raw => {
      if (cancelled) return
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SavedState
          if (parsed.date === todayKey) {
            const idMap = new Map(nfl.players.map(p => [p.id, p]))
            const restored = parsed.guessIds
              .map(id => idMap.get(id))
              .filter((p): p is Player => Boolean(p))
            setGuesses(restored)
          }
        } catch {}
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [mode, todayKey])

  useEffect(() => {
    if (mode !== "daily" || !hydrated) return
    const payload: SavedState = { date: todayKey, guessIds: guesses.map(g => g.id) }
    AsyncStorage.setItem(dailyStorageKey(todayKey), JSON.stringify(payload))
  }, [mode, guesses, hydrated, todayKey])

  const won = guesses.some(g => g.id === answer.id)
  const lost = !won && guesses.length >= MAX_GUESSES
  const finished = won || lost

  const alreadyGuessedIds = useMemo(() => new Set(guesses.map(g => g.id)), [guesses])

  const handleSubmit = useCallback(
    (player: Player) => {
      if (finished) return
      setGuesses(prev => [...prev, player])
    },
    [finished],
  )

  const handlePlayAgain = useCallback(() => {
    setAnswer(pickRandom(nfl.answerPool, p => p.id, answer.id))
    setGuesses([])
  }, [answer.id])

  return (
    <View className="flex-1 bg-primary-50 dark:bg-primary-900">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-6"
      >
        <View className="px-4 pt-3">
          <Text className="text-primary-700 dark:text-primary-100 text-xs uppercase tracking-widest">
            {mode === "daily" ? `${todayKey} · ` : "Arcade · "}
            {guesses.length} / {MAX_GUESSES}
          </Text>
        </View>

        <GuessGrid
          sport={nfl}
          answer={answer}
          guesses={guesses}
          maxGuesses={MAX_GUESSES}
        />

        {finished && (
          <View className="mx-4 mt-2 rounded-lg p-4 bg-primary-100 dark:bg-primary-800">
            <Text className="text-primary-900 dark:text-primary-50 text-lg font-extrabold">
              {won ? "Nice — you got it." : "Out of guesses."}
            </Text>
            <Text className="text-primary-700 dark:text-primary-200 mt-1">
              Answer: {answer.name} ({String(answer.teamAbbr ?? "")})
            </Text>

            {mode === "arcade" && (
              <Pressable
                onPress={handlePlayAgain}
                className="mt-4 self-start bg-accent-500 active:bg-accent-600 px-5 py-3 rounded-lg"
              >
                <Text className="text-primary-900 font-extrabold tracking-wider">PLAY AGAIN</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {!finished && (
        <GuessInput
          pool={nfl.players}
          alreadyGuessedIds={alreadyGuessedIds}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  )
}
