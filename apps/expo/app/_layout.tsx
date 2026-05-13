import "@/global.css"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#273a57" },
          headerTintColor: "#f2f6fb",
          contentStyle: { backgroundColor: "#18263c" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Playerdle" }} />
        <Stack.Screen name="daily" options={{ title: "Daily" }} />
      </Stack>
    </>
  )
}
