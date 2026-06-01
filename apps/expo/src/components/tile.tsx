import { Text, View } from "@/tw"
import type { CellStatus } from "@/lib/sport"

const STATUS_BG: Record<CellStatus, string> = {
  correct: "bg-success-600",
  close: "bg-warning-500",
  incorrect: "bg-neutral-600",
}

interface TileProps {
  value: string
  status: CellStatus
  arrow?: string
  label?: string
}

export function Tile({ value, status, arrow, label }: TileProps) {
  return (
    <View className="flex-1 items-center justify-center aspect-square m-0.5 rounded-md border border-primary-700">
      {label ? (
        <Text className="text-[10px] font-bold uppercase text-primary-300 mb-0.5">{label}</Text>
      ) : null}
      <View
        className={`flex-1 self-stretch items-center justify-center rounded-md ${STATUS_BG[status]}`}
      >
        <Text
          className="text-white font-bold text-sm"
          numberOfLines={1}
        >
          {value}
          {arrow ? ` ${arrow}` : ""}
        </Text>
      </View>
    </View>
  )
}

export function HeaderTile({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center aspect-square m-0.5 rounded-md bg-primary-800">
      <Text className="text-primary-100 text-[10px] font-extrabold uppercase tracking-wider">
        {label}
      </Text>
    </View>
  )
}
