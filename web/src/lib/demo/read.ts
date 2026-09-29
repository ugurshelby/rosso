import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPhaseState } from '@/lib/phase/read'
import { kilitTanimi, type KilitOzelligi } from '@/lib/quick-start/kilit-katalogu'

/**
 * Demo persona — "hayali önizleme" okuma katmanı (migration 0347/0348).
 * Plan: docs/plans/yeni-kullanici-deneyimi-quick-start.md §12.
 *
 * Fikir: kilitli bir yüzey, gerçek kullanıcı için okuyacağı VERİYİ aynı okuyucuyla
 * okur — yalnız kullanıcı kimliği yerine DEMO persona'nın kimliğiyle. Böylece ayrı
 * "sahte bileşen" yok; sayılar gerçek boru hattıyla üretildiği için tutarlı.
 *
 *   const { veriKullanicisi, demoMu } = await gosterimKaynagi(user.id, 'recap')
 *   const stats = await getDashboardStats(veriKullanicisi)      // aynı okuyucu
 *   <LockedShell demo={demoMu}>…</LockedShell>
 *
 * ⚠ KURALLAR
 *  1. `veriKullanicisi` YALNIZ OKUMA içindir. Yazan her yol (beğen, çalma listesi
 *     oluştur, Spotify'a yaz…) HER ZAMAN `user.id` kullanır. (Veritabanı da demo
 *     satırlarına yazmayı zaten reddeder: demo için yalnız-SELECT politikası var.)
 *  2. Demo, kullanıcının KENDİ verisiyle aynı ekranda KARIŞMAZ: kilitli bölüm
 *     tamamen demo, açık bölüm tamamen gerçek. `demoMu` bunu arayüze bildirir.
 *  3. Demo verisi kullanıcıya kendi verisi gibi sunulmaz (blur + "örnek önizleme"
 *     etiketi — `lock.samplePreview`).
 *  4. Faz kaynak süzgeci (`sourceFilter`/`historyWindow`) demo için UYGULANMAZ:
 *     demo persona "tam geçmişli" bir dinleyicidir → süzgeç `undefined` verin.
 */

const VARSAYILAN_PERSONA = 'varsayilan'

/** Persona'nın kullanıcı kimliği; henüz tohumlanmamışsa (yerel/yeni ortam) `null`. */
export const getDemoKullaniciId = cache(async (kod: string = VARSAYILAN_PERSONA): Promise<string | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('demo_kullanici_id', { p_kod: kod })
  if (error || typeof data !== 'string') return null
  return data
})

export interface GosterimKaynagi {
  /**
   * Verinin OKUNACAĞI kullanıcı. Kilit açıksa kullanıcının kendisi; kilitliyse
   * demo persona (yoksa yine kullanıcı — bkz. `demoMu`).
   */
  veriKullanicisi: string
  /** `veriKullanicisi` bir demo persona mı? Arayüz mühür/etiketi buna göre çizer. */
  demoMu: boolean
  /** Kilit açık mı? (`!kilitAcik` iken demo gösterilir.) */
  kilitAcik: boolean
}

/**
 * Bir kilit özelliği (`kilit-katalogu.ts`) için veri kaynağını seçer.
 *
 * Kilit AÇIKSA gerçek kullanıcı; KAPALIYSA demo persona. Demo hiç tohumlanmamışsa
 * (persona yok) kullanıcının kendi kimliğine düşer ve `demoMu=false` döner —
 * arayüz o durumda boş/mühürlü geometriyle devam eder, patlamaz.
 */
export async function gosterimKaynagi(userId: string, ozellik: KilitOzelligi): Promise<GosterimKaynagi> {
  const { capabilities } = await getPhaseState(userId)
  const kilitAcik = capabilities[kilitTanimi(ozellik).yetenek]
  if (kilitAcik) return { veriKullanicisi: userId, demoMu: false, kilitAcik: true }

  const demoId = await getDemoKullaniciId()
  if (!demoId) return { veriKullanicisi: userId, demoMu: false, kilitAcik: false }
  return { veriKullanicisi: demoId, demoMu: true, kilitAcik: false }
}

/**
 * Yazma yollarının savunma hattı: hedef bir demo persona ise işlemi reddet.
 * (Demo hesabı giriş yapamaz ve DB yazmayı zaten engeller; bu, bir kodlama
 * hatasının `veriKullanicisi`'ni yazıcıya vermesine karşı ikinci kilit.)
 */
export async function demoKullaniciysaReddet(hedefKullaniciId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('demo_mi', { p_user: hedefKullaniciId })
  return data === true
}
