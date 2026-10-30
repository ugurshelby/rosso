import { useNetworkState } from 'expo-network'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bosluk, KENAR, renk } from '@/tema'
import { Metin } from './Metin'

/**
 * Çevrimdışı şeridi (PLAN 4.6, spec §10): ekran önbellekteki son hâli göstermeye
 * devam eder; yalnız üstte kısa bir not. Bağlantı bilinmiyorsa (ilk an) gösterilmez.
 */
export function CevrimdisiSeridi() {
  const ag = useNetworkState()
  const ust = useSafeAreaInsets().top
  const cevrimdisi = ag.isConnected === false || ag.isInternetReachable === false
  if (!cevrimdisi) return null
  return (
    <View accessibilityRole="alert" style={[stil.serit, { paddingTop: ust + bosluk[1] }]}>
      <Metin rol="ustVeri" renkAdi="metin">
        Çevrimdışısın. Son kaydedilen hâli görüyorsun.
      </Metin>
    </View>
  )
}

const stil = StyleSheet.create({
  serit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: KENAR,
    paddingBottom: bosluk[2],
    backgroundColor: renk.yuzey3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: renk.kenar2,
  },
})
