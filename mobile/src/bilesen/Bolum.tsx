import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { bosluk, BOLUM_ARASI, KENAR } from '@/tema'
import { Metin } from './Metin'

/** Ekran içi bölüm: başlık (§4 bölüm başlığı) + isteğe bağlı sağ eylem; bölümler arası 32 (§5). */
export function Bolum({ baslik, sag, children, ilk }: { baslik: string; sag?: ReactNode; children: ReactNode; ilk?: boolean }) {
  return (
    <View style={{ marginTop: ilk ? 0 : BOLUM_ARASI }}>
      <View style={stil.baslik}>
        <Metin rol="bolumBasligi" accessibilityRole="header" style={{ flex: 1 }}>
          {baslik}
        </Metin>
        {sag}
      </View>
      {children}
    </View>
  )
}

const stil = StyleSheet.create({
  baslik: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: KENAR, marginBottom: bosluk[3] },
})
