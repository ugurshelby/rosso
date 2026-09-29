'use server'

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { anahtariAyristir } from './anahtarlar'
import { getQuickStartState } from './read'
import type { QuickStartDurumu } from './durum'

export type AnimasyonSonucu =
  | { ok: true; data: { kaydedilen: string[]; atlanan: string[] } }
  | { ok: false; error: string }

/** Tek çağrıda en fazla bu kadar anahtar (bir sayfada birkaç kilit açılabilir). */
const CAGRI_BASINA_ANAHTAR = 20
/** Dakikada en fazla bu kadar çağrı (animasyon bitiminde bir kez çağrılır — bol pay). */
const DAKIKADA_CAGRI = 30

/**
 * Anahtarın ŞU AN gerçekten hak edilmiş olup olmadığı: kart adımı tamam mı,
 * kilit açık mı. Hak edilmemiş animasyon "görüldü" işaretlenemez — yoksa
 * kullanıcı (ya da bozuk bir istemci) kilit AÇILMADAN kutlamayı tüketirdi ve
 * gerçekten açıldığında animasyon hiç oynamazdı.
 */
function hakEdilmisMi(anahtar: string, durum: QuickStartDurumu): boolean {
  const a = anahtariAyristir(anahtar)
  if (!a) return false
  if (a.aile === 'qs') return durum.adimlar.find((x) => x.adim === a.adim)?.tamam === true
  return durum.kilitler.find((k) => k.ozellik === a.ozellik)?.acik === true
}

/**
 * "Bu animasyon oynatıldı" kaydı.
 *
 * ⚠ ÇAĞRI ZAMANI: animasyon BİTTİKTEN sonra çağırın, başlarken değil. Bu eylem
 *   BİLİNÇLİ olarak `revalidatePath` çağırmaz: sayfa yeniden üretilirse ("görüldü"
 *   kartı DOM'dan düşer) çözülme animasyonu ortasında kesilirdi. İstemci animasyonu
 *   bitirir, eylemi çağırır, isterse `router.refresh()` ile durumu tazeler.
 *
 * Yalnız kataloğa uyan VE şu an hak edilmiş anahtarlar kaydedilir; kalanlar
 * `atlanan`'a düşer (hata değil — yarış/eski istemci normaldir).
 */
export async function animasyonGorulduIsaretle(anahtarlar: string[]): Promise<AnimasyonSonucu> {
  const user = await requireAuth()

  if (!Array.isArray(anahtarlar) || anahtarlar.length === 0) {
    return { ok: false, error: 'Anahtar listesi boş.' }
  }
  if (anahtarlar.length > CAGRI_BASINA_ANAHTAR) {
    return { ok: false, error: 'Çok fazla anahtar.' }
  }

  const limit = checkRateLimit(`animasyon-goruldu:${user.id}`, DAKIKADA_CAGRI, 60_000)
  if (!limit.allowed) {
    return { ok: false, error: 'Çok sık istek — biraz bekle.' }
  }

  const tekil = Array.from(new Set(anahtarlar.filter((k): k is string => typeof k === 'string')))
  const gecerli = tekil.filter((k) => anahtariAyristir(k) !== null)

  const durum = await getQuickStartState(user.id)
  const hakEdilen = durum.kaynak === 'ok' ? gecerli.filter((k) => hakEdilmisMi(k, durum)) : []
  const atlanan = tekil.filter((k) => !hakEdilen.includes(k))

  if (hakEdilen.length === 0) {
    return { ok: true, data: { kaydedilen: [], atlanan } }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('kullanici_animasyonlari').upsert(
    hakEdilen.map((anahtar) => ({ user_id: user.id, anahtar })),
    // ON CONFLICT DO NOTHING: zaten görülmüş anahtarın zamanı ezilmez.
    { onConflict: 'user_id,anahtar', ignoreDuplicates: true },
  )
  if (error) {
    return { ok: false, error: 'Kaydedilemedi, tekrar dene.' }
  }

  return { ok: true, data: { kaydedilen: hakEdilen, atlanan } }
}
