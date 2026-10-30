import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { BASMA_OLCEGI, BASMA_SURESI_MS, yay } from '@/tema'

export type Dokunsal = 'hafif' | 'secim'

export interface BasilabilirProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  /** Yalnız anlamlı anlarda (§8); varsayılan yok. */
  dokunsal?: Dokunsal
  /** Basınca küçülme (§6). Liste satırlarında kapalı. */
  olcekle?: boolean
}

/**
 * Dokunur dokunmaz geri bildirim: parmak inince 0.97'ye ~80 ms, kalkınca yayla 1.
 * Animasyon UI iş parçacığında; azaltılmış harekette ölçek yok.
 */
export function Basilabilir({
  style,
  children,
  dokunsal,
  olcekle = true,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: BasilabilirProps) {
  const azalt = useReducedMotion()
  const olcek = useSharedValue(1)
  const animStil = useAnimatedStyle(() => ({ transform: [{ scale: olcek.value }] }))
  const etkin = olcekle && !azalt

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={(e) => {
        if (etkin) olcek.set(withTiming(BASMA_OLCEGI, { duration: BASMA_SURESI_MS }))
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        if (etkin) olcek.set(withSpring(1, yay.basmaDonus))
        onPressOut?.(e)
      }}
      onPress={(e) => {
        if (dokunsal === 'hafif') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        if (dokunsal === 'secim') void Haptics.selectionAsync()
        onPress?.(e)
      }}
      {...rest}
    >
      <Animated.View style={[style, animStil]}>{children}</Animated.View>
    </Pressable>
  )
}
