import { Text, View } from "@/tw"
import { HeaderTile, Tile } from "./tile"
import { evaluateColumn, type Player, type SportConfig } from "@/lib/sport"

interface GuessGridProps {
  sport: SportConfig
  answer: Player
  guesses: Player[]
  maxGuesses: number
}

export function GuessGrid({ sport, answer, guesses, maxGuesses }: GuessGridProps) {
  const emptyRows = Math.max(0, maxGuesses - guesses.length)
  return (
    <View className="px-3 py-2">
      <View className="flex-row">
        {sport.columns.map(c => (
          <HeaderTile
            key={c.id}
            label={c.label}
          />
        ))}
      </View>

      {guesses.map((guess, rowIdx) => (
        <View
          key={`${guess.id}-${rowIdx}`}
          className="mt-1"
        >
          <Text className="text-primary-700 dark:text-primary-100 font-semibold text-sm mb-1 px-1">
            {guess.name}
          </Text>
          <View className="flex-row">
            {sport.columns.map(col => {
              const cell = evaluateColumn(guess, answer, col)
              return (
                <Tile
                  key={col.id}
                  value={cell.value}
                  status={cell.status}
                  arrow={cell.arrow}
                />
              )
            })}
          </View>
        </View>
      ))}

      {Array.from({ length: emptyRows }).map((_, i) => (
        <View
          key={`empty-${i}`}
          className="mt-1 flex-row"
        >
          {sport.columns.map(c => (
            <View
              key={c.id}
              className="flex-1 aspect-square m-0.5 rounded-md border border-primary-200 dark:border-primary-700"
            />
          ))}
        </View>
      ))}
    </View>
  )
}
