import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Basilabilir, Hap, Kapak, Metin, SarkiSatiri, YerTutucu } from '@/bilesen'
import { ortamOku } from '@/ortam'
import { bosluk, hitSlopIcin, KENAR, renk } from '@/tema'
import { ApiHatasi } from '@/veri/api'
import { useMoodCalismaAlanlari, useMoodDogrula, useMoodPaketi, useSpotifyaGonder } from '@/veri/mood'
import { moodBul, moodKapakUri, moodSarkilari, spotifyListeUrl, spotifySarkiUrl } from '@/veri/moodlar'

/**
 * Mood detayı (PLAN 4.7c, spec §9.2): büyük kapak + başlık, "Spotify'a gönder"
 * (yeşilin tek yeri), şarkı listesi. Açılınca durum Spotify'la doğrulanır
 * (PLAN 1.3); silinmişse "Spotify'dan kaldırılmış" + yeniden gönder.
 */
export default function MoodDetayi() {
  const { anahtar } = useLocalSearchParams<{ anahtar: string }>()
  const { top, bottom } = useSafeAreaInsets()
  const m = moodBul(anahtar ?? '')
  const paket = useMoodPaketi(anahtar ?? '')
  const calisma = useMoodCalismaAlanlari()
  const dogrula = useMoodDogrula()
  const gonder = useSpotifyaGonder()
  const durum = calisma.data?.get(anahtar ?? '')
  const sarkilar = useMemo(() => moodSarkilari(paket.data?.payload, durum?.hidden_track_ids ?? []), [paket.data, durum])

  useEffect(() => {
    if (anahtar && moodBul(anahtar)) dogrula.mutate(anahtar)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız açılışta
  }, [anahtar])

  if (!m) {
    return (
      <View style={[stil.kap, { paddingTop: top + bosluk[12], paddingHorizontal: KENAR }]}>
        <Metin rol="govde">Bu liste bulunamadı.</Metin>
      </View>
    )
  }

  const kaldirildi = dogrula.data?.kaldirilan.includes(m.anahtar) ?? false
  const spotifyId = durum?.exported_playlist_id ?? null
  const gonderHatasi =
    gonder.error instanceof ApiHatasi
      ? gonder.error.durum === 404
        ? 'Bu listede henüz şarkı yok.'
        : gonder.error.durum === 429
          ? 'Çok sık denedin, biraz bekle.'
          : 'Spotify şu an cevap vermedi.'
      : gonder.error
        ? 'Spotify şu an cevap vermedi.'
        : null

  const ust = (
    <View>
      <LinearGradient colors={[renk.yuzey3, renk.zemin]} style={[stil.hero, { paddingTop: top + bosluk[3] }]}>
        <Basilabilir
          onPress={() => router.back()}
          accessibilityLabel="Geri"
          hitSlop={hitSlopIcin(24)}
          style={stil.geri}
        >
          <Ionicons name="chevron-back" size={24} color={renk.metin} />
        </Basilabilir>
        <Kapak uri={moodKapakUri(ortamOku().ortam.webUrl, m)} boy="buyuk" style={{ alignSelf: 'center' }} />
      </LinearGradient>
      <View style={stil.baslik}>
        <Metin rol="buyukBaslik" accessibilityRole="header">
          {m.baslik}
        </Metin>
        <Metin rol="ustVeri" renkAdi="sonuk">
          {m.aciklama}
        </Metin>
        {kaldirildi ? (
          <Metin rol="ustVeri" renkAdi="uyari">
            Spotify&apos;dan kaldırılmış. İstersen yeniden gönder.
          </Metin>
        ) : null}
        <View style={stil.eylem}>
          {spotifyId ? (
            <Hap etiket="Spotify'da aç" tur="spotify" onPress={() => void Linking.openURL(spotifyListeUrl(spotifyId))} />
          ) : (
            <Hap
              etiket={gonder.isPending ? 'Gönderiliyor…' : "Spotify'a gönder"}
              tur="spotify"
              disabled={gonder.isPending || sarkilar.length === 0}
              onPress={() =>
                gonder.mutate(m.anahtar, {
                  onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
                  onError: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
                })
              }
            />
          )}
        </View>
        {gonderHatasi ? (
          <Metin rol="ustVeri" renkAdi="hata" accessibilityRole="alert">
            {gonderHatasi}
          </Metin>
        ) : null}
      </View>
    </View>
  )

  return (
    <View style={stil.kap}>
      <FlashList
        data={sarkilar}
        keyExtractor={(s) => s.trackId}
        ListHeaderComponent={ust}
        contentContainerStyle={{ paddingBottom: bottom + bosluk[8] }}
        ListEmptyComponent={
          paket.isPending ? (
            <View style={{ paddingHorizontal: KENAR, gap: bosluk[2] }}>
              {Array.from({ length: 6 }, (_, i) => (
                <YerTutucu key={i} yukseklik={56} />
              ))}
            </View>
          ) : (
            <Metin rol="govde" renkAdi="sonuk" style={{ paddingHorizontal: KENAR }}>
              Bu liste hazırlanıyor; günlük turda dolar.
            </Metin>
          )
        }
        renderItem={({ item, index }) => (
          <SarkiSatiri
            sira={index + 1}
            ad={item.ad}
            sanatci={item.sanatci}
            kapakUri={item.kapak}
            geriDonusumAnahtari={item.trackId}
            onPress={item.spotifyId ? () => void Linking.openURL(spotifySarkiUrl(item.spotifyId as string)) : undefined}
          />
        )}
      />
    </View>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  hero: { paddingBottom: bosluk[6] },
  geri: { width: 48, height: 48, justifyContent: 'center', paddingLeft: KENAR - 4 },
  baslik: { paddingHorizontal: KENAR, gap: bosluk[2], marginBottom: bosluk[4] },
  eylem: { flexDirection: 'row', marginTop: bosluk[2] },
})
