import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CevrimdisiSeridi } from '@/bilesen/CevrimdisiSeridi'
import { renk } from '@/tema'
import { OturumSaglayici } from '@/veri/oturum'
import { BIR_GUN, kaliciDepo, ONBELLEK_SURUMU, sorguIstemcisi, sorguOlaylariniBagla } from '@/veri/sorgu'

sorguOlaylariniBagla()

/**
 * Kök: koyu tema kalıcı, kenardan kenara, sistem geri hareketi açık (mobile-design.md).
 * Önbellek diskten geri yüklenir; ekranlar ilk karede son hâli çizer (M13).
 */
export default function KokDuzen() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: renk.zemin }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={sorguIstemcisi}
          persistOptions={{ persister: kaliciDepo, maxAge: 30 * BIR_GUN, buster: ONBELLEK_SURUMU }}
        >
          <OturumSaglayici>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.zemin } }} />
            <CevrimdisiSeridi />
          </OturumSaglayici>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
