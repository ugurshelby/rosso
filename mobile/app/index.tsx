import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ortamOku } from '@/ortam'

/**
 * İskelet açılış ekranı (PLAN 4.4). Gerçek ekranlar 4.7'de; burada yalnız
 * derlemenin doğru arka uca bağlandığı görülür.
 */
export default function Acilis() {
  const ust = useSafeAreaInsets().top
  const { ortam, eksik } = ortamOku()
  return (
    <View style={[stil.kap, { paddingTop: ust + 48 }]}>
      <Text style={stil.marka}>ROSSO</Text>
      {eksik.length > 0 ? (
        <Text style={stil.not} accessibilityRole="alert">
          Kurulum eksik: {eksik.join(', ')}. `.env` dosyasını doldurup yeniden derle.
        </Text>
      ) : (
        <Text style={stil.not}>{new URL(ortam.webUrl).host}</Text>
      )}
    </View>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: '#0a0910', alignItems: 'center', paddingHorizontal: 24 },
  marka: { color: '#f4f2f8', fontSize: 15, letterSpacing: 6, fontWeight: '700' },
  not: { color: '#9d97ad', fontSize: 14, marginTop: 16, textAlign: 'center' },
})
