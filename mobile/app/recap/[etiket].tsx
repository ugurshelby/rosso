import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { Kapak, Metin, YerTutucu } from '@/bilesen'
import { bosluk, KENAR, kose, projeksiyon, renk, yay } from '@/tema'
import { useRecap } from '@/veri/paketler'
import { hikayeSayfalari, type HikayeSayfasi } from '@/veri/recap'

const SAYFA_SURESI_MS = 6000
const UZUN_BASMA_MS = 250

/**
 * Recap hikâyesi (PLAN 4.7f, spec §9.4): tam ekran yatay sayfalar; üstte
 * ilerleme çizgileri, sağa dokun ileri / sola dokun geri, basılı tut duraklat,
 * aşağı çek kapat (hız projeksiyonuyla).
 */
export default function RecapHikayesi() {
  const { etiket } = useLocalSearchParams<{ etiket: string }>()
  const { top, bottom } = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const azalt = useReducedMotion()
  const recap = useRecap(etiket ?? '')
  const sayfalar = useMemo(() => hikayeSayfalari(recap.data?.payload, etiket ?? ''), [recap.data, etiket])
  const [sira, setSira] = useState(0)
  const ilerleme = useSharedValue(0)
  const y = useSharedValue(0)
  const basmaAni = useRef(0)

  const ileri = () => {
    if (sira < sayfalar.length - 1) setSira(sira + 1)
    else router.back()
  }
  const geri = () => setSira(Math.max(0, sira - 1))

  const oynat = (kalan: number) => {
    ilerleme.set(
      withTiming(1, { duration: kalan, easing: Easing.linear }, (bitti) => {
        'worklet'
        if (bitti) scheduleOnRN(ileri)
      }),
    )
  }

  useEffect(() => {
    if (!sayfalar.length) return
    ilerleme.set(0)
    oynat(SAYFA_SURESI_MS)
    return () => cancelAnimation(ilerleme)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sayfa değişince baştan
  }, [sira, sayfalar.length])

  const kapat = Gesture.Pan()
    .activeOffsetY(12)
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY))
    })
    .onEnd((e) => {
      if (e.translationY + projeksiyon(e.velocityY) > height * 0.3) scheduleOnRN(router.back)
      else y.set(withSpring(0, { ...yay.sheet, velocity: e.velocityY }))
    })

  const kartStil = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: 1 - Math.min(0.08, y.value / 4000) }],
    borderRadius: y.value > 0 ? kose.sheet : 0,
  }))

  if (recap.isPending) {
    return (
      <View style={[stil.kap, { paddingTop: top + bosluk[8], paddingHorizontal: KENAR, gap: bosluk[3] }]}>
        <YerTutucu yukseklik={40} genislik="60%" />
        <YerTutucu yukseklik={240} />
      </View>
    )
  }
  if (!sayfalar.length) {
    return (
      <Pressable style={[stil.kap, { paddingTop: top + bosluk[12], paddingHorizontal: KENAR }]} onPress={() => router.back()}>
        <Metin rol="govde" renkAdi="sonuk">
          Bu recap henüz hazır değil. Kapatmak için dokun.
        </Metin>
      </Pressable>
    )
  }

  const sayfa = sayfalar[sira] as HikayeSayfasi

  return (
    <GestureDetector gesture={kapat}>
      <Animated.View style={[stil.kap, kartStil, { overflow: 'hidden' }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="adjustable"
          accessibilityLabel={`${sira + 1}. sayfa, toplam ${sayfalar.length}`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? ileri() : geri())}
          onPressIn={() => {
            basmaAni.current = Date.now()
            cancelAnimation(ilerleme)
          }}
          onPressOut={() => {
            if (Date.now() - basmaAni.current >= UZUN_BASMA_MS) oynat(Math.max(200, (1 - ilerleme.value) * SAYFA_SURESI_MS))
          }}
          onPress={(e) => {
            if (Date.now() - basmaAni.current >= UZUN_BASMA_MS) return
            if (e.nativeEvent.locationX < width * 0.35) geri()
            else ileri()
          }}
        >
          <View style={[stil.ust, { paddingTop: top + bosluk[2] }]}>
            {sayfalar.map((_, i) => (
              <Cizgi key={i} durum={i < sira ? 'dolu' : i > sira ? 'bos' : 'aktif'} ilerleme={ilerleme} />
            ))}
          </View>
          <View style={[stil.icerik, { paddingBottom: bottom + bosluk[12] }]}>
            <Sayfa key={sira} s={sayfa} azalt={azalt} />
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}

function Cizgi({ durum, ilerleme }: { durum: 'dolu' | 'bos' | 'aktif'; ilerleme: ReturnType<typeof useSharedValue<number>> }) {
  const stilAktif = useAnimatedStyle(() => ({ width: `${(durum === 'aktif' ? ilerleme.value : durum === 'dolu' ? 1 : 0) * 100}%` }))
  return (
    <View style={stil.cizgi}>
      <Animated.View style={[stil.cizgiDolgu, stilAktif]} />
    </View>
  )
}

function Sayfa({ s, azalt }: { s: HikayeSayfasi; azalt: boolean }) {
  const giris = useSharedValue(azalt ? 1 : 0)
  useEffect(() => {
    if (!azalt) giris.set(withSpring(1, yay.varsayilan))
  }, [azalt, giris])
  const stilGiris = useAnimatedStyle(() => ({ opacity: giris.value, transform: [{ translateY: (1 - giris.value) * 16 }] }))

  return (
    <Animated.View style={[{ gap: bosluk[4] }, stilGiris]}>
      {s.tur === 'kapak' ? (
        <>
          <Metin rol="etiket" renkAdi="sonuk">
            {s.ust}
          </Metin>
          <Metin rol="hikaye">
            {s.baslik}
          </Metin>
        </>
      ) : (
        <Metin rol="etiket" renkAdi="sonuk">
          {s.baslik}
        </Metin>
      )}
      {s.tur === 'sayilar'
        ? s.satirlar.map((r) => (
            <View key={r.etiket} style={stil.sayiSatiri}>
              <Metin rol="govde" renkAdi="sonuk" style={{ flex: 1 }}>
                {r.etiket}
              </Metin>
              <Metin rol="bolumBasligi" sayisal>
                {r.deger}
              </Metin>
            </View>
          ))
        : null}
      {s.tur === 'bir-numara' ? (
        <>
          <Kapak uri={s.oge.kapak} boy="buyuk" />
          <Metin rol="buyukBaslik">{s.oge.ad}</Metin>
          <Metin rol="govde" renkAdi="sonuk">{`${s.oge.alt ?? ''} · ${s.oge.sayi ?? 0} dinleme`}</Metin>
        </>
      ) : null}
      {s.tur === 'liste'
        ? s.ogeler.map((o, i) => (
            <View key={`${o.ad}-${i}`} style={stil.listeSatiri}>
              <Metin rol="etiket" renkAdi="silik" sayisal style={{ width: 20 }}>
                {i + 1}
              </Metin>
              <Kapak uri={o.kapak} boy="satir" daire={s.daire} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Metin rol="govde" numberOfLines={1}>
                  {o.ad}
                </Metin>
                {o.alt ? (
                  <Metin rol="ustVeri" renkAdi="sonuk" numberOfLines={1}>
                    {o.alt}
                  </Metin>
                ) : null}
              </View>
              <Metin rol="etiket" renkAdi="sonuk" sayisal>
                {`${o.sayi ?? 0}×`}
              </Metin>
            </View>
          ))
        : null}
      {s.tur === 'buyuk-sayi' ? (
        <>
          <Metin rol="hikaye" sayisal>
            {s.deger}
          </Metin>
          <Metin rol="govde" renkAdi="sonuk">
            {s.alt}
          </Metin>
        </>
      ) : null}
    </Animated.View>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.yuzey1 },
  ust: { flexDirection: 'row', gap: bosluk[1], paddingHorizontal: KENAR },
  cizgi: { flex: 1, height: 3, borderRadius: 2, backgroundColor: renk.kenar2, overflow: 'hidden' },
  cizgiDolgu: { height: 3, backgroundColor: renk.metin },
  icerik: { flex: 1, justifyContent: 'center', paddingHorizontal: KENAR + bosluk[2] },
  sayiSatiri: { flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: renk.kenar1, paddingVertical: bosluk[3] },
  listeSatiri: { flexDirection: 'row', alignItems: 'center', gap: bosluk[3] },
})
