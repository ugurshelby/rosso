import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { renk } from '@/tema'

/** Kök: koyu tema kalıcı (mobile-design.md), kenardan kenara, sistem geri hareketi açık. */
export default function KokDuzen() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: renk.zemin }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.zemin } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
