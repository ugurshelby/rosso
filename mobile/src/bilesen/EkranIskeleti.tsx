import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bosluk, KENAR, renk } from '@/tema'
import { Metin } from './Metin'

/** Sekme çubuğunun kapladığı yükseklik (SekmeCubugu satırı 64 dp). */
export const SEKME_YUKSEKLIGI = 64

/**
 * Sekme ekranlarının ortak iskeleti: büyük başlık (§4), kenar boşluğu 16,
 * alt boşluk sekme çubuğu + gezinme çubuğu kadar.
 */
export function EkranIskeleti({ baslik, altBaslik, children }: { baslik: string; altBaslik?: string; children?: ReactNode }) {
  const { top, bottom } = useSafeAreaInsets()
  return (
    <ScrollView
      style={stil.kap}
      contentContainerStyle={{ paddingTop: top + bosluk[6], paddingBottom: bottom + SEKME_YUKSEKLIGI + bosluk[8] }}
    >
      <View style={stil.baslik}>
        <Metin rol="buyukBaslik" accessibilityRole="header">
          {baslik}
        </Metin>
        {altBaslik ? (
          <Metin rol="ustVeri" renkAdi="sonuk">
            {altBaslik}
          </Metin>
        ) : null}
      </View>
      {children}
    </ScrollView>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  baslik: { paddingHorizontal: KENAR, gap: bosluk[1], marginBottom: bosluk[6] },
})
