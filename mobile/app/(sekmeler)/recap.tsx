import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Basilabilir, Bolum, EkranIskeleti, Metin, YerTutucu, Yuzey } from '@/bilesen'
import { bosluk, KENAR, renk } from '@/tema'
import { useRecapler, type RecapOzeti } from '@/veri/paketler'

/**
 * Recap listesi (PLAN 4.7f, spec §9.4): yıllar büyük, aylar küçük kart;
 * dokununca tam ekran hikâye. Journey (4.7g) bu sekmenin başlığından açılacak.
 */
export default function RecapListesi() {
  const recaplar = useRecapler()
  const yillar = (recaplar.data ?? []).filter((r) => r.period_type === 'year')
  const aylar = (recaplar.data ?? []).filter((r) => r.period_type === 'month')

  return (
    <EkranIskeleti baslik="Recap" altBaslik="Her ayın ve yılın kendi hikâyesi">
      {recaplar.isPending ? (
        <View style={{ paddingHorizontal: KENAR, gap: bosluk[3] }}>
          <YerTutucu yukseklik={120} />
          <YerTutucu yukseklik={64} />
          <YerTutucu yukseklik={64} />
        </View>
      ) : !recaplar.data?.length ? (
        <Metin rol="govde" renkAdi="sonuk" style={{ paddingHorizontal: KENAR }}>
          {"İlk recap'in ay bitince hazırlanır."}
        </Metin>
      ) : (
        <>
          {yillar.length ? (
            <Bolum baslik="Yıllar" ilk>
              <View style={stil.liste}>
                {yillar.map((r) => (
                  <RecapKarti key={r.id} r={r} buyuk />
                ))}
              </View>
            </Bolum>
          ) : null}
          {aylar.length ? (
            <Bolum baslik="Aylar" ilk={!yillar.length}>
              <View style={stil.liste}>
                {aylar.map((r) => (
                  <RecapKarti key={r.id} r={r} />
                ))}
              </View>
            </Bolum>
          ) : null}
        </>
      )}
    </EkranIskeleti>
  )
}

function RecapKarti({ r, buyuk }: { r: RecapOzeti; buyuk?: boolean }) {
  return (
    <Basilabilir
      onPress={() => router.push({ pathname: '/recap/[etiket]', params: { etiket: r.period_label } })}
      accessibilityLabel={`${r.period_label} recap'ini aç`}
    >
      <Yuzey seviye={1} style={[stil.kart, buyuk && stil.buyuk]}>
        <Metin rol={buyuk ? 'hikaye' : 'varlik'} sayisal>
          {r.period_label}
        </Metin>
        <Metin rol="etiket" renkAdi="sonuk">
          {buyuk ? 'Yılın hikâyesi' : 'Ayın hikâyesi'}
        </Metin>
      </Yuzey>
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  liste: { paddingHorizontal: KENAR, gap: bosluk[3] },
  kart: { padding: bosluk[4], gap: bosluk[1], minHeight: 64, justifyContent: 'center' },
  buyuk: { minHeight: 120, backgroundColor: renk.yuzey2 },
})
