import { Text, type TextProps } from 'react-native'
import { EN_BUYUK_YAZI_CARPANI, renk, tip, type RenkAdi, type TipRolu } from '@/tema'

export interface MetinProps extends TextProps {
  rol?: TipRolu
  renkAdi?: RenkAdi
  /** Süre, sayaç, sıra: rakamlar hizalı (§4). */
  sayisal?: boolean
}

/** Tip ölçeğinin tek girişi; elle fontSize yazılmaz. */
export function Metin({ rol = 'govde', renkAdi = 'metin', sayisal, style, ...rest }: MetinProps) {
  return (
    <Text
      maxFontSizeMultiplier={EN_BUYUK_YAZI_CARPANI}
      style={[tip[rol], { color: renk[renkAdi] }, sayisal && { fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    />
  )
}
