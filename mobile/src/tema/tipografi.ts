import { Platform, type TextStyle } from 'react-native'

/**
 * Tip ölçeği (mobile-design.md §4). Fontlar derlemeye gömülü (app.config.ts):
 * Android'de aile adı dosya adıdır, iOS'ta fontun kendi aile adı + ağırlık.
 */
type Agirlik = '400' | '500' | '600' | '700'

const GEIST: Record<Agirlik, string> = {
  '400': 'Geist_400Regular',
  '500': 'Geist_500Medium',
  '600': 'Geist_600SemiBold',
  '700': 'Geist_700Bold',
}

function geist(agirlik: Agirlik): TextStyle {
  return Platform.OS === 'android'
    ? { fontFamily: GEIST[agirlik] }
    : { fontFamily: 'Geist', fontWeight: agirlik }
}

const mono: TextStyle =
  Platform.OS === 'android' ? { fontFamily: 'GeistMono_500Medium' } : { fontFamily: 'Geist Mono', fontWeight: '500' }

/** Yalnız Journey anlatısı (§4). */
export const anlatiFontu: TextStyle =
  Platform.OS === 'android'
    ? { fontFamily: 'BodoniModa_400Regular_Italic' }
    : { fontFamily: 'Bodoni Moda', fontStyle: 'italic' }

export const tip = {
  buyukBaslik: { ...geist('700'), fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  bolumBasligi: { ...geist('700'), fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  varlik: { ...geist('600'), fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  govde: { ...geist('500'), fontSize: 15, lineHeight: 20, letterSpacing: 0 },
  ustVeri: { ...geist('400'), fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  etiket: { ...mono, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>

export type TipRolu = keyof typeof tip

/** Sistem yazı boyutu ayarına uyulur ama düzen kırılmasın (§4). */
export const EN_BUYUK_YAZI_CARPANI = 1.3
