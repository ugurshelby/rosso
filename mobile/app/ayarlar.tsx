import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import Constants from 'expo-constants'
import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Basilabilir, Bolum, Hap, Metin, Yuzey } from '@/bilesen'
import { ortamOku } from '@/ortam'
import { bosluk, hitSlopIcin, KENAR, kose, renk } from '@/tema'
import { api } from '@/veri/api'
import { useOturum } from '@/veri/oturum'
import { paketAnahtari } from '@/veri/paketler'
import { onbellegiTemizle } from '@/veri/sorgu'
import { supabase } from '@/veri/supabase'
import { zipKontrol, zipYukle, type ZipAsamasi } from '@/veri/zip'

interface TokenDurumu {
  spotify: { connected: boolean; expired: boolean; exportImported: boolean } | null
  export: { hasCompleted: boolean; latestJob: { status?: string } | null }
}

/**
 * Ayarlar ve Veri (PLAN 4.7h, spec §9.7): hesap, Spotify bağlantısı (web BYOC
 * sihirbazı uygulama içi tarayıcıda, M7), ZIP yükleme (gerçek yüzde), çıkış.
 */
export default function Ayarlar() {
  const { top, bottom } = useSafeAreaInsets()
  const oturum = useOturum()
  const kimlik = oturum.durum === 'var' ? oturum.kullaniciId : ''
  const eposta = oturum.durum === 'var' ? oturum.oturum.user.email : undefined
  const webUrl = ortamOku().ortam.webUrl
  const durum = useQuery({
    queryKey: paketAnahtari(kimlik, 'token-durumu'),
    enabled: !!kimlik,
    queryFn: () => api<TokenDurumu>('/api/auth/token-status'),
  })
  const [zip, setZip] = useState<ZipAsamasi | null>(null)
  const [zipHata, setZipHata] = useState<string | null>(null)

  const zipSec = async () => {
    setZipHata(null)
    const secim = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed'], copyToCacheDirectory: true })
    const dosya = secim.canceled ? null : secim.assets[0]
    if (!dosya) return
    const d = { uri: dosya.uri, ad: dosya.name, boyut: dosya.size ?? 0 }
    const sorun = zipKontrol(d)
    if (sorun) {
      setZipHata(sorun)
      return
    }
    try {
      await zipYukle(d, setZip)
      void durum.refetch()
    } catch (e) {
      setZip(null)
      setZipHata(e instanceof Error ? e.message : 'Yükleme olmadı.')
    }
  }

  const spotify = durum.data?.spotify
  const spotifyMetni = !durum.data ? '…' : !spotify?.connected ? 'Bağlı değil' : spotify.expired ? 'Bağlantı koptu' : 'Bağlı'

  return (
    <ScrollView style={stil.kap} contentContainerStyle={{ paddingTop: top + bosluk[2], paddingBottom: bottom + bosluk[12] }}>
      <Basilabilir onPress={() => router.back()} accessibilityLabel="Geri" hitSlop={hitSlopIcin(24)} style={stil.geri}>
        <Ionicons name="chevron-back" size={24} color={renk.metin} />
      </Basilabilir>
      <Metin rol="buyukBaslik" accessibilityRole="header" style={stil.kenar}>
        Ayarlar
      </Metin>

      <Bolum baslik="Hesap">
        <Satir etiket="E-posta" deger={eposta ?? '—'} />
      </Bolum>

      <Bolum baslik="Spotify">
        <Satir etiket="Bağlantı" deger={spotifyMetni} uyari={spotify?.expired || spotify?.connected === false} />
        <View style={stil.eylem}>
          <Hap etiket="Spotify bağlantısını aç" onPress={() => void WebBrowser.openBrowserAsync(`${webUrl}/data`).then(() => durum.refetch())} />
        </View>
      </Bolum>

      <Bolum baslik="Dinleme geçmişi">
        <Satir
          etiket="Son içe aktarma"
          deger={durum.data?.export.latestJob?.status ?? (durum.data?.export.hasCompleted ? 'tamamlandı' : 'henüz yok')}
        />
        <View style={[stil.kenar, { gap: bosluk[3], marginTop: bosluk[3] }]}>
          <Metin rol="ustVeri" renkAdi="sonuk">
            Spotify &gt; Gizlilik sayfasından istediğin ZIP&apos;i seç; işlenince geçmişin buraya eklenir.
          </Metin>
          {zip?.asama === 'yukleniyor' ? <IlerlemeCubugu yuzde={zip.yuzde} /> : null}
          {zip?.asama === 'kuyrukta' ? (
            <Metin rol="ustVeri" renkAdi="basari">
              Yüklendi. İşlenmesi birkaç dakika sürebilir.
            </Metin>
          ) : null}
          {zipHata ? (
            <Metin rol="ustVeri" renkAdi="hata" accessibilityRole="alert">
              {zipHata}
            </Metin>
          ) : null}
          <Hap
            etiket={zip?.asama === 'yukleniyor' ? `Yükleniyor… %${zip.yuzde}` : zip?.asama === 'hazirlaniyor' ? 'Hazırlanıyor…' : 'ZIP yükle'}
            tur="birincil"
            disabled={zip?.asama === 'yukleniyor' || zip?.asama === 'hazirlaniyor'}
            onPress={() => void zipSec()}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      </Bolum>

      <Bolum baslik="Uygulama">
        <Satir etiket="Sürüm" deger={Constants.expoConfig?.version ?? '—'} />
        <Satir etiket="Sunucu" deger={webUrl ? new URL(webUrl).host : '—'} />
        <View style={stil.eylem}>
          <Hap
            etiket="Çıkış yap"
            onPress={async () => {
              await supabase()?.auth.signOut()
              await onbellegiTemizle()
            }}
          />
        </View>
      </Bolum>
    </ScrollView>
  )
}

function Satir({ etiket, deger, uyari }: { etiket: string; deger: string; uyari?: boolean }) {
  return (
    <View style={stil.satir} accessible accessibilityLabel={`${etiket}: ${deger}`}>
      <Metin rol="govde" style={{ flex: 1 }}>
        {etiket}
      </Metin>
      <Metin rol="ustVeri" renkAdi={uyari ? 'uyari' : 'sonuk'} numberOfLines={1}>
        {deger}
      </Metin>
    </View>
  )
}

function IlerlemeCubugu({ yuzde }: { yuzde: number }) {
  return (
    <Yuzey seviye={2} style={stil.cubuk} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: yuzde }}>
      <View style={[stil.dolgu, { width: `${yuzde}%` }]} />
    </Yuzey>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  kenar: { paddingHorizontal: KENAR },
  geri: { width: 48, height: 48, justifyContent: 'center', paddingLeft: bosluk[3] },
  satir: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: KENAR, gap: bosluk[3] },
  eylem: { paddingHorizontal: KENAR, marginTop: bosluk[3], flexDirection: 'row' },
  cubuk: { height: 6, borderRadius: kose.pil, overflow: 'hidden' },
  dolgu: { height: 6, borderRadius: kose.pil, backgroundColor: renk.vurgu },
})
