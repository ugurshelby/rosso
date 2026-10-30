import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { bosluk, KENAR } from '@/tema'
import { Basilabilir } from './Basilabilir'
import { Kapak } from './Kapak'
import { Metin } from './Metin'

export interface SarkiSatiriProps {
  sira?: number
  ad: string
  sanatci: string
  kapakUri?: string | null
  /** Sağdaki üst veri (süre, dinleme sayısı): mono, hizalı rakam. */
  sagVeri?: string
  sagEk?: ReactNode
  onPress?: () => void
  onLongPress?: () => void
  geriDonusumAnahtari?: string
}

/**
 * Spotify ergonomisi (§9.6): sıra · kapak 48 · ad/sanatçı · sağ veri. Satır
 * ölçeklenmez (liste içinde titreşim yaratır). Sola kaydırma (§7) 4.7(c)'de eklenir.
 */
export function SarkiSatiri({
  sira,
  ad,
  sanatci,
  kapakUri,
  sagVeri,
  sagEk,
  onPress,
  onLongPress,
  geriDonusumAnahtari,
}: SarkiSatiriProps) {
  return (
    <Basilabilir
      olcekle={false}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${ad}, ${sanatci}`}
      style={stil.satir}
    >
      {sira !== undefined ? (
        <Metin rol="etiket" renkAdi="silik" sayisal style={stil.sira}>
          {sira}
        </Metin>
      ) : null}
      <Kapak uri={kapakUri} boy="satir" geriDonusumAnahtari={geriDonusumAnahtari} />
      <View style={stil.metinler}>
        <Metin rol="govde" numberOfLines={1}>
          {ad}
        </Metin>
        <Metin rol="ustVeri" renkAdi="sonuk" numberOfLines={1}>
          {sanatci}
        </Metin>
      </View>
      {sagVeri ? (
        <Metin rol="etiket" renkAdi="sonuk" sayisal>
          {sagVeri}
        </Metin>
      ) : null}
      {sagEk}
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk[3],
    paddingHorizontal: KENAR,
    minHeight: 64,
    paddingVertical: bosluk[2],
  },
  sira: { width: 24, textAlign: 'right' },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
})
