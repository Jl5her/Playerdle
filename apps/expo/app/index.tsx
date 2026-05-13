import { useRouter } from "expo-router"
import { Pressable, Text, View } from "@/tw"

export default function MenuScreen() {
  const router = useRouter()
  return (
    <View className="flex-1 items-center justify-center bg-primary-900 px-6">
      <Text className="text-4xl font-black tracking-wider text-primary-50 mb-2">
        PLAYERDLE
      </Text>
      <Text className="text-primary-300 mb-12">NFL</Text>

      <View className="w-full max-w-sm gap-3">
        <Pressable
          onPress={() => router.push("/daily")}
          className="bg-accent-500 active:bg-accent-600 px-8 py-4 rounded-xl items-center"
        >
          <Text className="text-primary-900 font-extrabold text-lg tracking-wider">
            PLAY DAILY
          </Text>
          <Text className="text-primary-900/70 text-xs mt-1">
            One puzzle. Resets at midnight.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/arcade")}
          className="bg-primary-700 active:bg-primary-600 px-8 py-4 rounded-xl items-center border border-primary-500"
        >
          <Text className="text-primary-50 font-extrabold text-lg tracking-wider">
            PLAY ARCADE
          </Text>
          <Text className="text-primary-300 text-xs mt-1">
            Unlimited random players.
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
