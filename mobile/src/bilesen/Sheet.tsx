import { useEffect, useState, type ReactNode } from 'react'
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { AZALTILMIS_SURE_MS, kapanmaliMi, kose, lastikBant, renk, yay } from '@/tema'

export interface SheetProps {
  acik: boolean
  kapat: () => void
  children: ReactNode
  erisimEtiketi?: string
}

/**
 * Alttan sheet (§6-§7): tutamaçtan aşağı çekince parmağı 1:1 izler, bırakınca
 * hız projeksiyonuyla kapanır ya da yerine yaylanır; Android geri tuşu önce sheet'i
 * kapatır. Azaltılmış harekette yay yerine kısa geçiş.
 */
export function Sheet({ acik, kapat, children, erisimEtiketi }: SheetProps) {
  const { height: ekranY } = useWindowDimensions()
  const alt = useSafeAreaInsets().bottom
  const azalt = useReducedMotion()
  const [gorunur, setGorunur] = useState(acik)
  const [yukseklik, setYukseklik] = useState(ekranY * 0.6)
  const y = useSharedValue(ekranY)

  if (acik && !gorunur) setGorunur(true)

  useEffect(() => {
    if (!gorunur) return
    const bitince = (bitti?: boolean) => {
      'worklet'
      if (bitti && !acik) scheduleOnRN(setGorunur, false)
    }
    const hedef = acik ? 0 : yukseklik
    y.set(azalt ? withTiming(hedef, { duration: AZALTILMIS_SURE_MS }, bitince) : withSpring(hedef, yay.sheet, bitince))
  }, [acik, gorunur, yukseklik, azalt, y])

  useEffect(() => {
    if (!acik) return
    const abonelik = BackHandler.addEventListener('hardwareBackPress', () => {
      kapat()
      return true
    })
    return () => abonelik.remove()
  }, [acik, kapat])

  const surukle = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      y.set(e.translationY >= 0 ? e.translationY : -lastikBant(-e.translationY, yukseklik))
    })
    .onEnd((e) => {
      if (kapanmaliMi(y.value, e.velocityY, yukseklik)) {
        scheduleOnRN(kapat)
      } else {
        y.set(withSpring(0, { ...yay.sheet, velocity: e.velocityY }))
      }
    })

  const panelStil = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  const perdeStil = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, yukseklik], [1, 0], 'clamp'),
  }))

  if (!gorunur) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, stil.perde, perdeStil]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={kapat} accessibilityLabel="Kapat" />
      </Animated.View>
      <GestureDetector gesture={surukle}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={erisimEtiketi}
          onLayout={(e) => setYukseklik(e.nativeEvent.layout.height)}
          style={[stil.panel, { paddingBottom: alt + 16 }, panelStil]}
        >
          <View style={stil.tutamac} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const stil = StyleSheet.create({
  perde: { backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: renk.yuzey3,
    borderTopLeftRadius: kose.sheet,
    borderTopRightRadius: kose.sheet,
    paddingTop: 8,
  },
  tutamac: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: renk.kenar3, marginBottom: 12 },
})
