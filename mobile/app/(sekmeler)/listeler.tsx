import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Basilabilir, Bolum, Kapak, Metin, SarkiSatiri, SEKME_YUKSEKLIGI, YerTutucu } from '@/bilesen'
import { ortamOku } from '@/ortam'
import { bosluk, KENAR, kose, renk } from '@/tema'
import { useMoodCalismaAlanlari, useMoodDogrula } from '@/veri/mood'
import { MOODLAR, moodKapakUri, type MoodGrubu, type MoodTanimi } from '@/veri/moodlar'
import { usePlaylistler } from '@/veri/paketler'

type Filtre = 'mood' | 'kaydedilen'
const DOGRULAMA_ARALIGI_MS = 10 * 60 * 1000

/**
 * Listeler (PLAN 4.7c, spec §9.2): hap filtreleri, mood'lar 2 sütunlu kapak
 * ızgarası ve "Spotify'da" işareti. İşaret her açılışta (en çok 10 dk'da bir)
 * Spotify'la doğrulanır; silinmişse işaret kalkar.
 */
export default function Listeler() {
  const { top, bottom } = useSafeAreaInsets()
  const [filtre, setFiltre] = useState<Filtre>('mood')
  const calisma = useMoodCalismaAlanlari()
  const dogrula = useMoodDogrula()
  const sonDogrulama = useRef(0)

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - sonDogrulama.current < DOGRULAMA_ARALIGI_MS) return
      sonDogrulama.current = Date.now()
      dogrula.mutate(undefined)
      // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız odakta, mutate kararlı
    }, []),
  )

  return (
    <ScrollView
      style={stil.kap}
      contentContainerStyle={{ paddingTop: top + bosluk[6], paddingBottom: bottom + SEKME_YUKSEKLIGI + bosluk[8] }}
    >
      <Metin rol="buyukBaslik" accessibilityRole="header" style={stil.kenar}>
        Listeler
      </Metin>
      <View style={stil.haplar}>
        <FiltreHapi etiket="Mood" secili={filtre === 'mood'} bas={() => setFiltre('mood')} />
        <FiltreHapi etiket="Kaydedilen" secili={filtre === 'kaydedilen'} bas={() => setFiltre('kaydedilen')} />
      </View>

      {filtre === 'mood' ? (
        <>
          <MoodIzgarasi baslik="Rosso seçkileri" grup="rosso" ilk spotifyda={(k) => !!calisma.data?.get(k)?.exported_playlist_id} />
          <MoodIzgarasi baslik="Günün seçkileri" grup="gunluk" spotifyda={(k) => !!calisma.data?.get(k)?.exported_playlist_id} />
        </>
      ) : (
        <Kaydedilenler />
      )}
    </ScrollView>
  )
}

function MoodIzgarasi({ baslik, grup, ilk, spotifyda }: { baslik: string; grup: MoodGrubu; ilk?: boolean; spotifyda: (k: string) => boolean }) {
  const { width } = useWindowDimensions()
  const webUrl = ortamOku().ortam.webUrl
  const kart = Math.floor((width - KENAR * 2 - bosluk[3]) / 2)
  return (
    <Bolum baslik={baslik} ilk={ilk}>
      <View style={stil.izgara}>
        {MOODLAR.filter((m) => m.grup === grup).map((m) => (
          <MoodKarti key={m.anahtar} m={m} genislik={kart} kapakUri={moodKapakUri(webUrl, m)} spotifyda={spotifyda(m.anahtar)} />
        ))}
      </View>
    </Bolum>
  )
}

function MoodKarti({ m, genislik, kapakUri, spotifyda }: { m: MoodTanimi; genislik: number; kapakUri: string | null; spotifyda: boolean }) {
  return (
    <Basilabilir
      onPress={() => router.push({ pathname: '/mood/[anahtar]', params: { anahtar: m.anahtar } })}
      accessibilityLabel={spotifyda ? `${m.baslik}, Spotify'da` : m.baslik}
      style={{ width: genislik }}
    >
      <Kapak uri={kapakUri} boy="kart" style={{ width: genislik, height: genislik }} />
      <View style={stil.kartAlti}>
        <Metin rol="govde" numberOfLines={1} style={{ flex: 1 }}>
          {m.baslik}
        </Metin>
        {spotifyda ? <View style={stil.spotifyIsareti} accessibilityElementsHidden /> : null}
      </View>
    </Basilabilir>
  )
}

function Kaydedilenler() {
  const listeler = usePlaylistler()
  if (listeler.isPending) {
    return (
      <View style={[stil.kenar, { gap: bosluk[2] }]}>
        {Array.from({ length: 6 }, (_, i) => (
          <YerTutucu key={i} yukseklik={56} />
        ))}
      </View>
    )
  }
  if (!listeler.data?.length) {
    return (
      <Metin rol="govde" renkAdi="sonuk" style={stil.kenar}>
        {"Henüz kaydedilmiş liste yok. Spotify'daki listelerin bir sonraki tazelemede burada görünür."}
      </Metin>
    )
  }
  return (
    <View>
      {listeler.data.map((l) => (
        <SarkiSatiri
          key={l.id}
          ad={l.name}
          sanatci={l.track_count != null ? `${l.track_count} şarkı` : ''}
          kapakUri={l.cover_url ?? l.image_url}
          geriDonusumAnahtari={l.id}
        />
      ))}
    </View>
  )
}

function FiltreHapi({ etiket, secili, bas }: { etiket: string; secili: boolean; bas: () => void }) {
  return (
    <Basilabilir
      onPress={bas}
      accessibilityRole="tab"
      accessibilityState={{ selected: secili }}
      accessibilityLabel={etiket}
      hitSlop={4}
      style={[stil.hap, { backgroundColor: secili ? renk.vurgu : renk.yuzey2 }]}
    >
      <Metin rol="ustVeri" renkAdi={secili ? 'vurguUstu' : 'metin'}>
        {etiket}
      </Metin>
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  kenar: { paddingHorizontal: KENAR },
  haplar: { flexDirection: 'row', gap: bosluk[2], paddingHorizontal: KENAR, marginTop: bosluk[4], marginBottom: bosluk[6] },
  hap: { minHeight: 40, paddingHorizontal: bosluk[4], borderRadius: kose.pil, justifyContent: 'center' },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk[3], paddingHorizontal: KENAR },
  kartAlti: { flexDirection: 'row', alignItems: 'center', gap: bosluk[2], marginTop: bosluk[2] },
  spotifyIsareti: { width: 8, height: 8, borderRadius: 4, backgroundColor: renk.spotify },
})
