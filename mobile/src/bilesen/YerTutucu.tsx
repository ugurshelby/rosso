import { useEffect } from 'react'
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { kose, renk } from '@/tema'

export interface YerTutucuProps {
  genislik?: DimensionValue
  yukseklik: number
  yuvarlak?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Yalnız önbellek BOŞKEN (ilk kurulum) görünen iskelet (§10). Yavaş nabız;
 * azaltılmış harekette sabit.
 */
export function YerTutucu({ genislik = '100%', yukseklik, yuvarlak = kose.kart, style }: YerTutucuProps) {
  const azalt = useReducedMotion()
  const opaklik = useSharedValue(0.55)
  useEffect(() => {
    if (azalt) return
    opaklik.set(withRepeat(withTiming(0.9, { duration: 900 }), -1, true))
    return () => cancelAnimation(opaklik)
  }, [azalt, opaklik])
  const animStil = useAnimatedStyle(() => ({ opacity: opaklik.value }))
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: genislik, height: yukseklik, borderRadius: yuvarlak, backgroundColor: renk.yuzey2 }, animStil, style]}
    />
  )
}
