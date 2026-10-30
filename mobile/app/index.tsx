import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Metin } from '@/bilesen'
import { ortamOku } from '@/ortam'
import { bosluk, KENAR, renk } from '@/tema'

/**
 * İskelet açılış ekranı (PLAN 4.4). Gerçek ekranlar 4.7'de; burada yalnız
 * derlemenin doğru arka uca bağlandığı görülür.
 */
export default function Acilis() {
  const ust = useSafeAreaInsets().top
  const { ortam, eksik } = ortamOku()
  return (
    <View style={[stil.kap, { paddingTop: ust + bosluk[12] }]}>
      <Metin rol="etiket">Rosso</Metin>
      {eksik.length > 0 ? (
        <Metin rol="govde" renkAdi="sonuk" accessibilityRole="alert" style={stil.not}>
          {`Kurulum eksik: ${eksik.join(', ')}. .env dosyasını doldurup yeniden derle.`}
        </Metin>
      ) : (
        <Metin rol="govde" renkAdi="sonuk" style={stil.not}>
          {new URL(ortam.webUrl).host}
        </Metin>
      )}
    </View>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin, alignItems: 'center', paddingHorizontal: KENAR },
  not: { marginTop: bosluk[4], textAlign: 'center' },
})
