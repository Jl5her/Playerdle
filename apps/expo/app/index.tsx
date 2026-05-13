import { Link } from "expo-router"
import { Pressable, Text, View } from "@/tw"

export default function MenuScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary-900 px-6">
      <Text className="text-4xl font-black tracking-wider text-primary-50 mb-2">
        PLAYERDLE
      </Text>
      <Text className="text-primary-300 mb-12">NFL · Daily</Text>

      <Link href="/daily" asChild>
        <Pressable className="bg-accent-500 active:bg-accent-600 px-8 py-4 rounded-xl">
          <Text className="text-primary-900 font-extrabold text-lg tracking-wider">
            PLAY DAILY
          </Text>
        </Pressable>
      </Link>
    </View>
  )
}
