import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import * as Network from 'expo-network'
import { AppState, Platform } from 'react-native'

/**
 * Önce önbellek (mimari M13, spec §1 "Anında"): son veri diskten ilk karede
 * çizilir, arka planda yenilenir. Paketler sunucuda günde bir/saatte bir
 * değiştiği için 5 dk taze sayılır; ekran odaklanınca / uygulama öne gelince yenilenir.
 */
export const BIR_GUN = 24 * 60 * 60 * 1000

export const sorguIstemcisi = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * BIR_GUN, // kalıcı önbellek bundan uzun yaşayamaz
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online' },
  },
})

/** Kalıcı önbellek: AsyncStorage (token DEĞİL, yalnız paket verisi; token guvenliDepo'da). */
export const kaliciDepo = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rosso-sorgu-onbellegi',
  throttleTime: 1000,
})

/** Uygulama sürümü değişince eski biçimli önbellek atılır. */
export const ONBELLEK_SURUMU = '1'

let baglandi = false

/** AppState → odak, expo-network → çevrimiçi durumu. Bir kez çağrılır. */
export function sorguOlaylariniBagla() {
  if (baglandi || Platform.OS === 'web') return
  baglandi = true
  AppState.addEventListener('change', (durum) => focusManager.setFocused(durum === 'active'))
  onlineManager.setEventListener((ayarla) => {
    const abonelik = Network.addNetworkStateListener((d) => {
      ayarla(d.isConnected !== false && d.isInternetReachable !== false)
    })
    return () => abonelik.remove()
  })
}

/** Oturum değişince (çıkış / başka hesap) başka kullanıcının önbelleği görünmesin. */
export async function onbellegiTemizle() {
  sorguIstemcisi.clear()
  await kaliciDepo.removeClient()
}
