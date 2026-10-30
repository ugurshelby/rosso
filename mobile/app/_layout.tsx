import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/** Kök: koyu tema kalıcı (mobile-design.md), kenardan kenara, sistem geri hareketi açık. */
export default function KokDuzen() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0910' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0910' } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
