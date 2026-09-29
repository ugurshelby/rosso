import { cleanTrackTitle } from '@/lib/recap/clean-title'

/**
 * Journey podyumu / marquee / "Bugün" bölümü için kısa şarkı adı.
 *
 * `cleanTrackTitle` süslemeyi (feat., remix, live…) temizler ama **seri
 * önekini** kesmez. Journey podyumunda gerçek örnek:
 *
 *   'Mevsim Olmayan Mekanlar V: Unutulanlar (feat. …)'
 *
 * Kullanıcının bildiği ad **'Unutulanlar'**. Ham başlık basılınca podyum
 * metin bloğu büyüyor ve `align-items: end` grid'de #1 slotu görsel olarak
 * #2'nin altına iniyor — hiyerarşi çöküyor (J2).
 *
 * Kesim yalnız güvenli kalıpta yapılır: **Roma rakamı veya sayı + iki nokta**.
 * Bu, albüm/EP serilerinin standart yazımıdır. Serbest iki nokta kesilmez —
 * 'Blade Runner: Tears in Rain' gibi adlar bozulmasın diye:
 *
 *   'Mevsim Olmayan Mekanlar V: Unutulanlar' → 'Unutulanlar'   ✓ (Roma rakamı)
 *   'Bölüm 3: Kar'                           → 'Kar'           ✓ (sayı)
 *   'Blade Runner: Tears in Rain'            → değişmez        ✓ (kalıp yok)
 *   'Jay-Z'                                  → değişmez        ✓
 *
 * ⚠ Kesim sonrası kalan kısım boşsa veya anlamsız kısaysa (≤2 karakter)
 * temizlenmiş tam başlık korunur — kırpmaktansa uzun basmak yeğdir.
 */

/** Roma rakamı (I–XX aralığını kapsar) veya 1-2 basamaklı sayı + ':' */
const SERIES_PREFIX = /^.+\s+(?:[IVXLC]{1,5}|\d{1,2})\s*:\s*(.+)$/

/** Kesim sonrası kabul edilecek en kısa başlık. */
const MIN_TITLE_LENGTH = 3

export function displayTrackTitle(raw: string): string {
  if (!raw) return raw

  const cleaned = cleanTrackTitle(raw)
  const match = SERIES_PREFIX.exec(cleaned)
  if (!match) return cleaned

  const tail = match[1]?.trim() ?? ''
  return tail.length >= MIN_TITLE_LENGTH ? tail : cleaned
}
