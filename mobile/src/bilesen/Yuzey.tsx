import { View, type ViewProps } from 'react-native'
import { kose, renk } from '@/tema'

const ZEMIN = [renk.yuzey0, renk.yuzey1, renk.yuzey2, renk.yuzey3] as const

export interface YuzeyProps extends ViewProps {
  /** 0 zemin · 1 kart · 2 kontrol/basılı · 3 sheet (§3). */
  seviye?: 0 | 1 | 2 | 3
  /** Kart köşesi (8) varsayılan; sheet kendi köşesini verir. */
  koseli?: boolean
}

export function Yuzey({ seviye = 1, koseli = true, style, ...rest }: YuzeyProps) {
  return <View style={[{ backgroundColor: ZEMIN[seviye] }, koseli && { borderRadius: kose.kart }, style]} {...rest} />
}
