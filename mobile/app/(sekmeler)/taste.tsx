import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Bolum, EkranIskeleti, Metin, SarkiSatiri, YerTutucu, Yuzey } from '@/bilesen'
import { bosluk, KENAR, kose, renk } from '@/tema'
import { useTastePaketi, useTopSeritler } from '@/veri/paketler'
import { saatlikDagilim, turPaylari, yuzdeMetni } from '@/veri/taste'

/**
 * Taste (PLAN 4.7e, spec §9.3): Şu An / Değişmeyenler, tür payları (yatay
 * çubuk), günün saatleri (24 hücre). Kimlik plakası (vibe kartı) web'in eşleme
 * kuralı taşınınca eklenecek. Jargon yok: oran ve saat.
 */
export default function Taste() {
  const taste = useTastePaketi()
  const seritler = useTopSeritler()
  const turler = useMemo(() => turPaylari(taste.data?.payload), [taste.data])
  const saat = useMemo(() => saatlikDagilim(taste.data?.payload), [taste.data])
  const simdi = (seritler.data ?? []).filter((s) => s.strip === 'now').slice(0, 5)
  const kalici = (seritler.data ?? []).filter((s) => s.strip === 'evergreen').slice(0, 5)
  const yukleniyor = taste.isPending && seritler.isPending

  return (
    <EkranIskeleti baslik="Taste" altBaslik="Şu an ne dinliyorsun, hangisi hiç değişmiyor">
      {yukleniyor ? (
        <View style={{ paddingHorizontal: KENAR, gap: bosluk[3] }}>
          <YerTutucu yukseklik={200} />
          <YerTutucu yukseklik={160} />
        </View>
      ) : (
        <>
          {simdi.length ? (
            <Bolum baslik="Şu an" ilk>
              {simdi.map((s) => (
                <SarkiSatiri key={`n-${s.rank}`} sira={s.rank} ad={s.title} sanatci={s.artist} />
              ))}
            </Bolum>
          ) : null}
          {kalici.length ? (
            <Bolum baslik="Değişmeyenler" ilk={!simdi.length}>
              {kalici.map((s) => (
                <SarkiSatiri key={`e-${s.rank}`} sira={s.rank} ad={s.title} sanatci={s.artist} />
              ))}
            </Bolum>
          ) : null}
          {turler.length ? (
            <Bolum baslik="Türlerin">
              <View style={stil.turler}>
                {turler.map((t) => (
                  <View key={t.tur} accessible accessibilityLabel={`${t.tur} ${yuzdeMetni(t.oran)}`} style={{ gap: bosluk[1] }}>
                    <View style={stil.turSatiri}>
                      <Metin rol="govde" numberOfLines={1} style={{ flex: 1 }}>
                        {t.tur}
                      </Metin>
                      <Metin rol="etiket" renkAdi="sonuk" sayisal>
                        {yuzdeMetni(t.oran)}
                      </Metin>
                    </View>
                    <Yuzey seviye={2} style={stil.cubuk}>
                      <View style={[stil.dolgu, { width: `${Math.max(2, t.oran * 100)}%` }]} />
                    </Yuzey>
                  </View>
                ))}
              </View>
            </Bolum>
          ) : null}
          {saat.enYogun !== null ? (
            <Bolum baslik="Günün saatleri">
              <View style={{ paddingHorizontal: KENAR, gap: bosluk[3] }}>
                <Metin rol="ustVeri" renkAdi="sonuk">{`En çok ${String(saat.enYogun).padStart(2, '0')}:00 civarı dinliyorsun.`}</Metin>
                <SaatSeridi saatler={saat.saatler} />
              </View>
            </Bolum>
          ) : null}
          {!simdi.length && !kalici.length && !turler.length ? (
            <Metin rol="govde" renkAdi="sonuk" style={{ paddingHorizontal: KENAR }}>
              Zevkin birkaç gün dinledikçe burada şekillenir.
            </Metin>
          ) : null}
        </>
      )}
    </EkranIskeleti>
  )
}

function SaatSeridi({ saatler }: { saatler: number[] }) {
  const enCok = Math.max(1, ...saatler)
  return (
    <View>
      <View style={stil.saatler} accessible accessibilityLabel="Saatlere göre dinleme yoğunluğu">
        {saatler.map((s, i) => (
          <View key={i} style={[stil.hucre, { opacity: 0.12 + (s / enCok) * 0.88 }]} />
        ))}
      </View>
      <View style={stil.saatEtiketleri}>
        {['00', '06', '12', '18', '23'].map((e) => (
          <Metin key={e} rol="etiket" renkAdi="silik" sayisal>
            {e}
          </Metin>
        ))}
      </View>
    </View>
  )
}

const stil = StyleSheet.create({
  turler: { paddingHorizontal: KENAR, gap: bosluk[3] },
  turSatiri: { flexDirection: 'row', alignItems: 'baseline', gap: bosluk[2] },
  cubuk: { height: 8, borderRadius: kose.pil, overflow: 'hidden' },
  dolgu: { height: 8, borderRadius: kose.pil, backgroundColor: renk.vurgu },
  saatler: { flexDirection: 'row', gap: 2, height: 32 },
  hucre: { flex: 1, borderRadius: 2, backgroundColor: renk.vurgu },
  saatEtiketleri: { flexDirection: 'row', justifyContent: 'space-between', marginTop: bosluk[1] },
})
