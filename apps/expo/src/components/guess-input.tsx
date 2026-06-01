import { useMemo, useState } from "react"
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw"
import type { Player } from "@/lib/sport"

interface GuessInputProps {
  pool: Player[]
  alreadyGuessedIds: Set<string>
  disabled?: boolean
  onSubmit: (player: Player) => void
}

const MAX_SUGGESTIONS = 6

export function GuessInput({ pool, alreadyGuessedIds, disabled, onSubmit }: GuessInputProps) {
  const [query, setQuery] = useState("")

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const out: Player[] = []
    for (const p of pool) {
      if (alreadyGuessedIds.has(p.id)) continue
      if (p.name.toLowerCase().includes(q)) {
        out.push(p)
        if (out.length >= MAX_SUGGESTIONS) break
      }
    }
    return out
  }, [pool, query, alreadyGuessedIds])

  return (
    <View className="px-3 pb-3">
      <TextInput
        value={query}
        onChangeText={setQuery}
        editable={!disabled}
        placeholder="Search players..."
        placeholderTextColor="#9eafc6"
        autoCorrect={false}
        autoCapitalize="words"
        className="rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-primary-800 px-4 py-3 text-primary-900 dark:text-primary-50"
      />
      {suggestions.length > 0 && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          className="mt-2 max-h-64 rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800"
        >
          {suggestions.map(p => (
            <Pressable
              key={p.id}
              onPress={() => {
                setQuery("")
                onSubmit(p)
              }}
              className="px-4 py-3 border-b border-primary-100 dark:border-primary-700 active:bg-primary-50 dark:active:bg-primary-700"
            >
              <Text className="text-primary-900 dark:text-primary-50 font-medium">{p.name}</Text>
              <Text className="text-primary-500 dark:text-primary-300 text-xs mt-0.5">
                {String(p.teamAbbr ?? "")} · {String(p.position ?? "")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
