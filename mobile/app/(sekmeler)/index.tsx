import * as WebBrowser from 'expo-web-browser'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Bolum, Hap, KapakRayi, Metin, SarkiSatiri, SEKME_YUKSEKLIGI, YerTutucu, Yuzey } from '@/bilesen'
import { ortamOku } from '@/ortam'
import { bosluk, KENAR, renk } from '@/tema'
import { sureMetni, useAyinEnCoklari, useSonDinlenenler, type StatsPayload } from '@/veri/anaSayfa'
import { useOturum } from '@/veri/oturum'
import { useRecapler, useStatsPaketi } from '@/veri/paketler'

/**
 * Ana Sayfa (PLAN 4.7b, spec §9.1): sayılar · son dinlenenler rayı · ayın en
 * çokları · son recap. Önbellek ilk karede; aşağı çek yenile (§7). Veri yoksa
 * tek eylem: verini ekle (web'in veri sayfası, BYOC + ZIP).
 */
export default function AnaSayfa() {
  const { top, bottom } = useSafeAreaInsets()
  const oturum = useOturum()
  const istemci = useQueryClient()
  const [yenileniyor, setYenileniyor] = useState(false)
  const stats = useStatsPaketi()
  const son = useSonDinlenenler()
  const enCok = useAyinEnCoklari()
  const recaplar = useRecapler()

  const p = (stats.data?.payload ?? null) as StatsPayload | null
  const veriYok = stats.isSuccess && !p && son.isSuccess && (son.data?.length ?? 0) === 0
  const ilkYukleme = stats.isPending && son.isPending
  const sonRecap = recaplar.data?.[0]

  const yenile = async () => {
    if (oturum.durum !== 'var') return
    setYenileniyor(true)
    await istemci.invalidateQueries({ queryKey: ['paket', oturum.kullaniciId] })
    setYenileniyor(false)
  }

  return (
    <ScrollView
      style={stil.kap}
      contentContainerStyle={{ paddingTop: top + bosluk[6], paddingBottom: bottom + SEKME_YUKSEKLIGI + bosluk[8] }}
      refreshControl={
        <RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={renk.vurgu} colors={[renk.vurgu]} progressBackgroundColor={renk.yuzey2} />
      }
    >
      <View style={stil.kenar}>
        <Metin rol="buyukBaslik" accessibilityRole="header">
          Bugün
        </Metin>
      </View>

      {ilkYukleme ? (
        <View style={[stil.kenar, { gap: bosluk[3], marginTop: bosluk[6] }]}>
          <YerTutucu yukseklik={72} />
          <YerTutucu yukseklik={200} />
          <YerTutucu yukseklik={240} />
        </View>
      ) : veriYok ? (
        <VeriYok />
      ) : (
        <>
          {p ? <Sayilar p={p} /> : null}

          {(son.data?.length ?? 0) > 0 ? (
            <Bolum baslik="Son dinlenenler">
              <KapakRayi
                ogeler={(son.data ?? []).map((s) => ({ anahtar: s.trackId, baslik: s.ad, altBaslik: s.sanatci, kapakUri: s.kapak }))}
              />
            </Bolum>
          ) : null}

          {(enCok.data?.length ?? 0) > 0 ? (
            <Bolum baslik="Bu ayın en çokları">
              {(enCok.data ?? []).map((s, i) => (
                <SarkiSatiri
                  key={s.trackId}
                  sira={i + 1}
                  ad={s.ad}
                  sanatci={s.sanatci}
                  kapakUri={s.kapak}
                  sagVeri={s.sayi ? `${s.sayi}×` : undefined}
                  geriDonusumAnahtari={s.trackId}
                />
              ))}
            </Bolum>
          ) : null}

          {sonRecap ? (
            <Bolum baslik="Son recap">
              <Yuzey seviye={1} style={stil.recap}>
                <Metin rol="etiket" renkAdi="sonuk">
                  {sonRecap.period_type === 'year' ? 'Yıl' : 'Ay'}
                </Metin>
                <Metin rol="varlik">{sonRecap.period_label}</Metin>
              </Yuzey>
            </Bolum>
          ) : null}

          {son.isError || enCok.isError ? (
            <View style={[stil.kenar, { marginTop: bosluk[6], gap: bosluk[3] }]}>
              <Metin rol="ustVeri" renkAdi="sonuk">
                Son hâl getirilemedi. Ekranda kayıtlı son veri duruyor.
              </Metin>
              <Hap etiket="Tekrar dene" onPress={yenile} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}

function Sayilar({ p }: { p: StatsPayload }) {
  const kutular = [
    { etiket: 'Dinleme', deger: sureMetni(p.total_ms) },
    { etiket: 'Şarkı', deger: (p.unique_tracks ?? 0).toLocaleString('tr-TR') },
    { etiket: 'Sanatçı', deger: (p.unique_artists ?? 0).toLocaleString('tr-TR') },
  ]
  return (
    <View style={[stil.kenar, stil.sayilar]}>
      {kutular.map((k) => (
        <Yuzey key={k.etiket} seviye={1} style={stil.sayi} accessible accessibilityLabel={`${k.etiket}: ${k.deger}`}>
          <Metin rol="etiket" renkAdi="sonuk">
            {k.etiket}
          </Metin>
          <Metin rol="varlik" sayisal numberOfLines={1} adjustsFontSizeToFit>
            {k.deger}
          </Metin>
        </Yuzey>
      ))}
    </View>
  )
}

function VeriYok() {
  const webUrl = ortamOku().ortam.webUrl
  return (
    <Yuzey seviye={1} style={[stil.kenarIc, stil.bos]}>
      <Metin rol="varlik">Hikâyen burada başlayacak</Metin>
      <Metin rol="govde" renkAdi="sonuk">
        {"Spotify hesabını bağla ya da dinleme geçmişi ZIP'ini yükle; ilk dinlemeler birkaç dakikada görünür."}
      </Metin>
      <Hap etiket="Verini ekle" tur="birincil" onPress={() => void WebBrowser.openBrowserAsync(`${webUrl}/data`)} />
    </Yuzey>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  kenar: { paddingHorizontal: KENAR },
  kenarIc: { marginHorizontal: KENAR },
  sayilar: { flexDirection: 'row', gap: bosluk[2], marginTop: bosluk[6] },
  sayi: { flex: 1, padding: bosluk[3], gap: bosluk[1] },
  recap: { marginHorizontal: KENAR, padding: bosluk[4], gap: bosluk[1] },
  bos: { marginTop: bosluk[6], padding: bosluk[5], gap: bosluk[3] },
})
