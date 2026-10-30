import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { kose, renk, type RenkAdi } from '@/tema'
import { Basilabilir, type BasilabilirProps } from './Basilabilir'
import { Metin } from './Metin'

export type HapTuru = 'birincil' | 'ikincil' | 'spotify'

const TUR: Record<HapTuru, { zemin: string; yazi: RenkAdi }> = {
  birincil: { zemin: renk.vurgu, yazi: 'vurguUstu' },
  ikincil: { zemin: renk.yuzey2, yazi: 'metin' },
  // Spotify yeşili yalnız "Spotify'da aç / Spotify'a gönder" (§3).
  spotify: { zemin: renk.spotify, yazi: 'vurguUstu' },
}

export interface HapProps extends Omit<BasilabilirProps, 'children' | 'style'> {
  etiket: string
  tur?: HapTuru
  style?: StyleProp<ViewStyle>
}

/** Tam pil buton (§5). Görünür yükseklik 44, dokunma hedefi 48. */
export function Hap({ etiket, tur = 'ikincil', style, disabled, ...rest }: HapProps) {
  const t = TUR[tur]
  return (
    <Basilabilir
      accessibilityLabel={etiket}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={2}
      style={[stil.hap, { backgroundColor: t.zemin, opacity: disabled ? 0.5 : 1 }, style]}
      {...rest}
    >
      <Metin rol="varlik" renkAdi={t.yazi} numberOfLines={1}>
        {etiket}
      </Metin>
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  hap: { minHeight: 44, paddingHorizontal: 20, borderRadius: kose.pil, alignItems: 'center', justifyContent: 'center' },
})
