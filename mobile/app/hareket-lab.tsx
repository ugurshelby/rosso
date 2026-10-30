import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Basilabilir, Hap, Metin, SarkiSatiri, Sheet, Yuzey } from '@/bilesen'
import { bosluk, KENAR, kose, renk, yay, type YayAdi, type YayAyari } from '@/tema'

/**
 * Hareket Laboratuvarı (PLAN 4.5, gizli: `rosso://hareket-lab`). Her yay ön
 * ayarı telefonda denenir; beğenilen değerler `src/tema/hareket.ts`'e ve
 * mobile-design.md §6'ya yazılır. Gerçek ekranlarda bağlantısı yok.
 */
export default function HareketLab() {
  const ust = useSafeAreaInsets().top
  const [sheetAcik, setSheetAcik] = useState(false)
  const [ayar, setAyar] = useState<Record<YayAdi, YayAyari>>({ ...yay })

  return (
    <View style={stil.kap}>
      <ScrollView contentContainerStyle={{ paddingTop: ust + bosluk[4], paddingBottom: 120 }}>
        <Metin rol="buyukBaslik" style={stil.kenar}>
          Hareket
        </Metin>
        <Metin rol="ustVeri" renkAdi="sonuk" style={[stil.kenar, { marginTop: bosluk[1] }]}>
          Her kutuya dokun; yayı ayarla, değerleri not et.
        </Metin>

        {(Object.keys(ayar) as YayAdi[]).map((ad) => (
          <YayDeneme
            key={ad}
            ad={ad}
            ayar={ayar[ad]}
            degistir={(yeni) => setAyar((onceki) => ({ ...onceki, [ad]: yeni }))}
          />
        ))}

        <Metin rol="bolumBasligi" style={[stil.kenar, { marginTop: bosluk[8] }]}>
          Bileşenler
        </Metin>
        <View style={[stil.kenar, stil.haplar]}>
          <Hap etiket="Birincil" tur="birincil" dokunsal="hafif" />
          <Hap etiket="Spotify'a gönder" tur="spotify" />
          <Hap etiket="Sheet aç" onPress={() => setSheetAcik(true)} />
        </View>
        <SarkiSatiri sira={1} ad="Şarkı adı uzun olursa tek satırda kesilir" sanatci="Sanatçı" sagVeri="3:42" />
        <SarkiSatiri sira={2} ad="İkinci şarkı" sanatci="Başka sanatçı" sagVeri="12" />
      </ScrollView>

      <Sheet acik={sheetAcik} kapat={() => setSheetAcik(false)} erisimEtiketi="Deneme sheet'i">
        <View style={{ paddingHorizontal: KENAR, gap: bosluk[3] }}>
          <Metin rol="bolumBasligi">Sheet</Metin>
          <Metin rol="govde" renkAdi="sonuk">
            Aşağı çek, hızlı fırlat, yavaş bırak: karar hızın projeksiyonuyla verilir.
          </Metin>
          <Hap etiket="Kapat" tur="birincil" onPress={() => setSheetAcik(false)} />
        </View>
      </Sheet>
    </View>
  )
}

function YayDeneme({ ad, ayar, degistir }: { ad: YayAdi; ayar: YayAyari; degistir: (a: YayAyari) => void }) {
  const x = useSharedValue(0)
  const [sagda, setSagda] = useState(false)
  const stilX = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
  const sonum = ayar.dampingRatio
  const sure = ayar.duration

  return (
    <Yuzey seviye={1} style={stil.kart}>
      <View style={stil.basliksatir}>
        <Metin rol="varlik">{ad}</Metin>
        <Metin rol="etiket" renkAdi="sonuk" sayisal>
          {`sönüm ${sonum.toFixed(2)} · ${sure} ms`}
        </Metin>
      </View>
      <Basilabilir
        olcekle={false}
        accessibilityLabel={`${ad} yayını dene`}
        style={stil.pist}
        onPress={() => {
          x.set(withSpring(sagda ? 0 : 220, ayar))
          setSagda(!sagda)
        }}
      >
        <Animated.View style={[stil.kutu, stilX]} />
      </Basilabilir>
      <View style={stil.ayarlar}>
        <Hap etiket="sönüm −" onPress={() => degistir({ ...ayar, dampingRatio: Math.max(0.3, +(sonum - 0.05).toFixed(2)) })} />
        <Hap etiket="sönüm +" onPress={() => degistir({ ...ayar, dampingRatio: Math.min(1.5, +(sonum + 0.05).toFixed(2)) })} />
        <Hap etiket="süre −" onPress={() => degistir({ ...ayar, duration: Math.max(100, sure - 25) })} />
        <Hap etiket="süre +" onPress={() => degistir({ ...ayar, duration: Math.min(1200, sure + 25) })} />
      </View>
    </Yuzey>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  kenar: { paddingHorizontal: KENAR },
  kart: { marginHorizontal: KENAR, marginTop: bosluk[4], padding: bosluk[4], gap: bosluk[3] },
  basliksatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pist: { height: 56, justifyContent: 'center', backgroundColor: renk.yuzey2, borderRadius: kose.kart, paddingHorizontal: bosluk[2] },
  kutu: { width: 40, height: 40, borderRadius: kose.kart, backgroundColor: renk.vurgu },
  ayarlar: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk[2] },
  haplar: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk[2], marginTop: bosluk[3], marginBottom: bosluk[3] },
})
