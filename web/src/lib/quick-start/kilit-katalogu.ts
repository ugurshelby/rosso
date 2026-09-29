import type { BooleanCapability } from '@/lib/phase/read'

/**
 * Faz kilidi kataloğu — "hangi özellik neyi bekliyor?" için TEK kaynak.
 *
 * Neden ayrı bir katalog (2026-09-24): `ROUTE_CAPABILITY` yalnız ROTA → yetenek
 * eşler ve rota kilitliyse nav'ı gizlemek için yazılmıştı. Yeni deneyimde
 * (docs/plans/yeni-kullanici-deneyimi-quick-start.md) nav ve sayfalar HER ZAMAN
 * görünür; kilit yalnız içeriği mühürler. Mühür üstündeki metin ("Spotify'ını
 * bağla", "ZIP'i yükle") ve açılış animasyonunun kaydı için her kilitli yüzeyin
 * bir ADI ve bir AÇILIŞ KOŞULU olmalı — o bilgi burada.
 *
 * ⚠ Katalog metin (kopya) TUTMAZ: ekranda ne yazacağı arayüzün işi. Burada yalnız
 *   makinece okunan gerçekler var (hangi yetenek, hangi adım açar, hangi ZIP).
 * ⚠ `ozellik` adları animasyon kaydının anahtarıdır (`kilit:<ozellik>`) ve
 *   migration 0345'in geri doldurma listesiyle AYNI olmalı.
 */

/** Kilidi hangi Quick Start adımı açar. */
export type AcanAdim = 'spotify' | 'zip'

/** Hangi ZIP türleri gerekir (`zip` adımı için). */
export type ZipTuru = 'streaming' | 'account' | 'technical'

export interface KilitTanimi {
  /** Animasyon anahtarı ve katalog anahtarı (`kilit:<ozellik>`). */
  ozellik: string
  /** `PhaseCapabilities`'teki aç/kapa yetenek. Kilit durumunun tek kaynağı. */
  yetenek: BooleanCapability
  /** Kilidi açan Quick Start adımı (kullanıcıyı nereye yönlendireceğimiz). */
  acanAdim: AcanAdim
  /** `acanAdim === 'zip'` ise gereken ZIP'ler; değilse boş. */
  gerekenZipler: readonly ZipTuru[]
  /** Yüzeyin yaşadığı rota; yüzey bir sayfa DEĞİL bölümse `null`. */
  rota: string | null
}

export const KILIT_KATALOGU = [
  // ── Faz 2 · Spotify bağlantısı (canlı API) ─────────────────────────────
  { ozellik: 'playlists', yetenek: 'canSeePlaylists', acanAdim: 'spotify', gerekenZipler: [], rota: '/playlists' },
  { ozellik: 'son-dinlenenler', yetenek: 'canSeeRecentPlays', acanAdim: 'spotify', gerekenZipler: [], rota: null },
  { ozellik: 'kisa-istatistik', yetenek: 'canSeeShortTermStats', acanAdim: 'spotify', gerekenZipler: [], rota: null },
  // ── Faz 3 · Streaming History ZIP ──────────────────────────────────────
  { ozellik: 'recap', yetenek: 'canSeeRecap', acanAdim: 'zip', gerekenZipler: ['streaming'], rota: '/recap' },
  { ozellik: 'taste', yetenek: 'canSeeTaste', acanAdim: 'zip', gerekenZipler: ['streaming'], rota: '/taste' },
  { ozellik: 'gecmis', yetenek: 'canSeeHistory', acanAdim: 'zip', gerekenZipler: ['streaming'], rota: '/gecmis' },
  { ozellik: 'mood', yetenek: 'canSeeMood', acanAdim: 'zip', gerekenZipler: ['streaming'], rota: '/playlists/mood' },
  { ozellik: 'journey', yetenek: 'canSeeJourney', acanAdim: 'zip', gerekenZipler: ['streaming'], rota: '/journey' },
  // ── Faz 4 · Hesap Verisi + Teknik Günlük ZIP'leri (ikisi birlikte) ─────
  { ozellik: 'begeniler', yetenek: 'canSeeLikedSongs', acanAdim: 'zip', gerekenZipler: ['account', 'technical'], rota: '/playlists/liked' },
  { ozellik: 'playlist-zaman-cizelgesi', yetenek: 'canSeePlaylistTimeline', acanAdim: 'zip', gerekenZipler: ['account', 'technical'], rota: null },
  { ozellik: 'araba', yetenek: 'canSeeCar', acanAdim: 'zip', gerekenZipler: ['account', 'technical'], rota: null },
] as const satisfies readonly KilitTanimi[]

export type KilitOzelligi = (typeof KILIT_KATALOGU)[number]['ozellik']

const OZELLIK_KUMESI: ReadonlySet<string> = new Set(KILIT_KATALOGU.map((k) => k.ozellik))

export function kilitOzelligiMi(deger: string): deger is KilitOzelligi {
  return OZELLIK_KUMESI.has(deger)
}

export function kilitTanimi(ozellik: KilitOzelligi): KilitTanimi {
  const t = KILIT_KATALOGU.find((k) => k.ozellik === ozellik)
  // `KilitOzelligi` katalogdan türetildiği için buraya ulaşılamaz; yine de
  // sessiz `undefined` yerine yüksek sesle düş.
  if (!t) throw new Error(`Bilinmeyen kilit özelliği: ${ozellik}`)
  return t
}
