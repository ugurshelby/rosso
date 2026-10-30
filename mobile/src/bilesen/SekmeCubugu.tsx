import { BlurView } from 'expo-blur'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { useState } from 'react'
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AZALTILMIS_SURE_MS, kose, renk, yay } from '@/tema'
import { Basilabilir } from './Basilabilir'
import { Metin } from './Metin'

/**
 * Android'de bulanıklık pahalı (§3): telefonda kare kaybı ölçülene kadar yedek
 * yüzey (yarı saydam yuzey1 + üstte 1 px ışık çizgisi). iOS'ta gerçek cam.
 */
const CAM = Platform.OS === 'ios'

/**
 * Özel sekme çubuğu (§2): ikon + her zaman görünür etiket, Deep Violet aktif
 * gösterge yayla kayar, gezinme çubuğunun üstünde durur.
 */
export function SekmeCubugu({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const alt = useSafeAreaInsets().bottom
  const azalt = useReducedMotion()
  const [genislik, setGenislik] = useState(0)
  const dilim = state.routes.length > 0 ? genislik / state.routes.length : 0

  const gosterge = useAnimatedStyle(() => {
    const x = state.index * dilim + dilim * 0.3
    return {
      width: dilim * 0.4,
      transform: [{ translateX: azalt ? withTiming(x, { duration: AZALTILMIS_SURE_MS }) : withSpring(x, yay.varsayilan) }],
    }
  }, [state.index, dilim, azalt])

  return (
    <View style={[stil.kap, { paddingBottom: alt }]} onLayout={(e: LayoutChangeEvent) => setGenislik(e.nativeEvent.layout.width)}>
      {CAM ? (
        <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, stil.yedekCam]} />
      )}
      <View style={stil.isikCizgisi} />
      <Animated.View style={[stil.gosterge, gosterge]} />
      <View style={stil.satir}>
        {state.routes.map((rota, i) => {
          const secenek = descriptors[rota.key]?.options
          const etiket = typeof secenek?.tabBarLabel === 'string' ? secenek.tabBarLabel : (secenek?.title ?? rota.name)
          const aktif = state.index === i
          const ikon = secenek?.tabBarIcon?.({ focused: aktif, color: aktif ? renk.metin : renk.sonuk, size: 24 })
          return (
            <Basilabilir
              key={rota.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              accessibilityLabel={etiket}
              style={stil.sekme}
              onPress={() => {
                const olay = emitter.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true })
                if (!aktif && !olay.defaultPrevented) navigateToTab(rota.key)
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: rota.key })}
            >
              {ikon}
              <Metin rol="etiket" renkAdi={aktif ? 'metin' : 'sonuk'} numberOfLines={1} style={stil.etiket}>
                {etiket}
              </Metin>
            </Basilabilir>
          )
        })}
      </View>
    </View>
  )
}

const stil = StyleSheet.create({
  kap: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  yedekCam: { backgroundColor: renk.yuzey1 + 'f2' },
  isikCizgisi: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.10)' },
  gosterge: { position: 'absolute', top: 0, left: 0, height: 2, borderRadius: kose.pil, backgroundColor: renk.vurgu },
  satir: { flexDirection: 'row', height: 64 },
  sekme: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48 },
  etiket: { textTransform: 'none', letterSpacing: 0.2 },
})
