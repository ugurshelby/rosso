import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CevrimdisiSeridi } from '@/bilesen/CevrimdisiSeridi'
import { renk } from '@/tema'
import { donusuCoz } from '@/veri/derinBaglanti'
import { OturumSaglayici, useOturum } from '@/veri/oturum'
import { BIR_GUN, kaliciDepo, ONBELLEK_SURUMU, sorguIstemcisi, sorguOlaylariniBagla } from '@/veri/sorgu'
import { supabase } from '@/veri/supabase'

sorguOlaylariniBagla()
void SplashScreen.preventAutoHideAsync()

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
            <Rotalar />
            <CevrimdisiSeridi />
          </OturumSaglayici>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Oturum kapısı (PLAN 4.7a): oturum SecureStore'dan okunana kadar açılış ekranı
 * kalır (boş ekran yanıp sönmez); sonra yalnız izinli rota grubu görünür.
 */
function Rotalar() {
  const oturum = useOturum()
  const url = Linking.useURL()

  useEffect(() => {
    if (oturum.durum !== 'yukleniyor') SplashScreen.hide()
  }, [oturum.durum])

  // E-posta doğrulama / şifre bağlantısı `rosso://giris` ile döner (M6).
  useEffect(() => {
    const db = supabase()
    const donus = donusuCoz(url)
    if (!db) return
    if (donus.tur === 'oturum') {
      void db.auth.setSession({ access_token: donus.accessToken, refresh_token: donus.refreshToken })
    } else if (donus.tur === 'kod') {
      void db.auth.exchangeCodeForSession(donus.kod)
    }
  }, [url])

  const kurulumEksik = oturum.durum === 'kurulum-eksik'
  const girisli = oturum.durum === 'var'

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.zemin } }}>
      <Stack.Protected guard={kurulumEksik}>
        <Stack.Screen name="kurulum" />
      </Stack.Protected>
      <Stack.Protected guard={!kurulumEksik && girisli}>
        <Stack.Screen name="(sekmeler)" />
        <Stack.Screen name="mood/[anahtar]" />
        <Stack.Screen name="hareket-lab" />
      </Stack.Protected>
      <Stack.Protected guard={!kurulumEksik && !girisli}>
        <Stack.Screen name="giris" />
      </Stack.Protected>
    </Stack>
  )
}
