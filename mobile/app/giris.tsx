import * as Linking from 'expo-linking'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Basilabilir, Hap, Metin } from '@/bilesen'
import { bosluk, KENAR, kose, renk, tip } from '@/tema'
import { epostaGecerliMi, girisHatasiMetni } from '@/veri/giris'
import { supabase } from '@/veri/supabase'

type Kip = 'giris' | 'kayit' | 'sifre'

const BASLIK: Record<Kip, string> = {
  giris: 'Tekrar hoş geldin',
  kayit: 'Davetle katıl',
  sifre: 'Şifreni yenile',
}

/**
 * Giriş (PLAN 4.7a, mimari M6): e-posta + şifre. Kayıt davet kapısından geçer
 * (0359, veritabanında); doğrulama ve şifre bağlantıları `rosso://giris`'e döner.
 */
export default function Giris() {
  const ust = useSafeAreaInsets().top
  const [kip, setKip] = useState<Kip>('giris')
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [mesgul, setMesgul] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)

  const gonder = async () => {
    const db = supabase()
    if (!db) return
    setHata(null)
    setBilgi(null)
    if (!epostaGecerliMi(eposta)) {
      setHata('Geçerli bir e-posta yaz.')
      return
    }
    setMesgul(true)
    const donus = Linking.createURL('giris')
    try {
      if (kip === 'giris') {
        const { error } = await db.auth.signInWithPassword({ email: eposta.trim(), password: sifre })
        setHata(girisHatasiMetni(error))
      } else if (kip === 'kayit') {
        const { data, error } = await db.auth.signUp({
          email: eposta.trim(),
          password: sifre,
          options: { emailRedirectTo: donus },
        })
        if (error) setHata(girisHatasiMetni(error))
        else if (!data.session) setBilgi('E-postana bir doğrulama bağlantısı gönderdik. Dokununca buraya dönersin.')
      } else {
        const { error } = await db.auth.resetPasswordForEmail(eposta.trim(), { redirectTo: donus })
        if (error) setHata(girisHatasiMetni(error))
        else setBilgi('Şifre yenileme bağlantısı e-postana gitti.')
      }
    } finally {
      setMesgul(false)
    }
  }

  return (
    <KeyboardAvoidingView style={stil.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[stil.icerik, { paddingTop: ust + bosluk[12] }]} keyboardShouldPersistTaps="handled">
        <Metin rol="etiket" renkAdi="sonuk">
          Rosso
        </Metin>
        <Metin rol="buyukBaslik" accessibilityRole="header" style={{ marginTop: bosluk[2] }}>
          {BASLIK[kip]}
        </Metin>
        {kip === 'kayit' ? (
          <Metin rol="ustVeri" renkAdi="sonuk" style={{ marginTop: bosluk[2] }}>
            Rosso kişisel bir kurulum. Yalnız sahibinin davet ettiği e-postalar katılabilir.
          </Metin>
        ) : null}

        <View style={stil.form}>
          <Alan etiket="E-posta" deger={eposta} degistir={setEposta} tur="eposta" />
          {kip !== 'sifre' ? <Alan etiket="Şifre" deger={sifre} degistir={setSifre} tur="sifre" gonder={gonder} /> : null}

          {hata ? (
            <Metin rol="ustVeri" renkAdi="hata" accessibilityRole="alert" accessibilityLiveRegion="polite">
              {hata}
            </Metin>
          ) : null}
          {bilgi ? (
            <Metin rol="ustVeri" renkAdi="basari" accessibilityLiveRegion="polite">
              {bilgi}
            </Metin>
          ) : null}

          <Hap
            etiket={mesgul ? 'Bekle…' : kip === 'giris' ? 'Giriş yap' : kip === 'kayit' ? 'Kayıt ol' : 'Bağlantı gönder'}
            tur="birincil"
            disabled={mesgul || !eposta || (kip !== 'sifre' && sifre.length < 6)}
            onPress={gonder}
          />
        </View>

        <View style={stil.alt}>
          {kip !== 'giris' ? <Baglanti metin="Girişe dön" bas={() => setKip('giris')} /> : null}
          {kip === 'giris' ? <Baglanti metin="Şifreni mi unuttun?" bas={() => setKip('sifre')} /> : null}
          {kip === 'giris' ? <Baglanti metin="Davetin mi var? Kayıt ol" bas={() => setKip('kayit')} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Alan({
  etiket,
  deger,
  degistir,
  tur,
  gonder,
}: {
  etiket: string
  deger: string
  degistir: (v: string) => void
  tur: 'eposta' | 'sifre'
  gonder?: () => void
}) {
  return (
    <View style={{ gap: bosluk[2] }}>
      <Metin rol="ustVeri" renkAdi="sonuk">
        {etiket}
      </Metin>
      <TextInput
        value={deger}
        onChangeText={degistir}
        accessibilityLabel={etiket}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={tur === 'eposta' ? 'email-address' : 'default'}
        autoComplete={tur === 'eposta' ? 'email' : 'current-password'}
        textContentType={tur === 'eposta' ? 'emailAddress' : 'password'}
        secureTextEntry={tur === 'sifre'}
        returnKeyType={tur === 'sifre' ? 'go' : 'next'}
        onSubmitEditing={gonder}
        placeholderTextColor={renk.silik}
        selectionColor={renk.vurgu}
        style={stil.girdi}
      />
    </View>
  )
}

function Baglanti({ metin, bas }: { metin: string; bas: () => void }) {
  return (
    <Basilabilir olcekle={false} onPress={bas} accessibilityRole="link" style={stil.baglanti}>
      <Metin rol="govde" renkAdi="vurguBasili">
        {metin}
      </Metin>
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  icerik: { paddingHorizontal: KENAR, paddingBottom: bosluk[12] },
  form: { marginTop: bosluk[8], gap: bosluk[4] },
  girdi: {
    ...tip.govde,
    color: renk.metin,
    minHeight: 48,
    paddingHorizontal: bosluk[4],
    borderRadius: kose.kart,
    backgroundColor: renk.yuzey1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: renk.kenar2,
  },
  alt: { marginTop: bosluk[6], gap: bosluk[1], alignItems: 'flex-start' },
  baglanti: { minHeight: 48, justifyContent: 'center' },
})
