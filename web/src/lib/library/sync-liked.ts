import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { getSpotifyToken } from '@/lib/playlists/spotify-target'
import { fetchWithRetry, RateLimitedError } from '@/lib/playlists/fetch-retry'
import { resolveOrCreateTrackByIdentity } from '@/lib/catalog/resolve-track'

/**
 * Beğenilen şarkıları Spotify'dan **canlı tazele**.
 *
 * ★ Uç nokta sözleşmesi: `docs/reference/spotify-veri-ve-zip.md` §2.
 *
 * ── Neden gerekli ──────────────────────────────────────────────────────────
 * Beğeniler Account Data ZIP'inden geliyordu; ZIP bir **fotoğraf**, canlı akış
 * değil. Sahibin hesabında son beğeni olayı 19 Temmuz 2026'da donmuştu —
 * sonrasında Spotify'da beğenilen hiçbir şey Rosso'ya gelmedi (ölçüldü:
 * Spotify 2.696, Rosso 2.661).
 *
 * `GET /me/tracks` Şubat 2026'da KALDIRILMADI (yalnız yazma uçları değişti),
 * `added_at` döner ve sayfalanabilir → boşluk kapatılabilir.
 *
 * ── §4.2 dış API disiplini ────────────────────────────────────────────────
 *   1. Sayfalar arası **250ms geçit**
 *   2. 429 → cooldown'ı DB'ye yaz
 *   3. Tur başında `is_blocked` — bloklu isek token bile alma
 *   4. Sayfa tavanı: sonsuz döngüye karşı sert sınır
 *
 * ⚠ Bu iş **okuma**dır ama 54+ istek atar; en pahalı okuma turumuz. Ölçülen
 * maliyet: 2.700 beğeni ≈ 54 sayfa × 250ms ≈ 14 saniye.
 *
 * ── Neden `createServiceClient` (ÖLÇÜLDÜ 2026-08-05) ───────────────────────
 * `liked_songs_events` RLS'i INSERT'e **yalnız `service_role`** izni verir
 * (SELECT kullanıcıya açık). Tablo tasarımda worker/ZIP tarafından doldurulur.
 * Kullanıcı istemcisiyle yazınca:
 *
 *   new row violates row-level security policy  (code 42501)
 *
 * ⚠ Bu hata Server Action'a **yansımıyordu**: senkron 31 sn koşuyor, log
 * `POST 200` yazıyor, kullanıcı "tazelenemedi" görüyor ama sebebi hiçbir
 * yerde yok. Rosso 2.661'de çakılı kaldı. Politikayı gevşetmek YANLIŞ
 * çözümdü — istemciye beğeni geçmişi yazma yetkisi vermek olurdu.
 *
 * Yetki kontrolü `like-action.ts`'te yapılır (`requireAuth` + faz kapısı);
 * buraya yalnız doğrulanmış `userId` gelir.
 */

const PROVIDER = 'spotify'
const GATE_MS = 250
const PAGE_SIZE = 50
const FALLBACK_COOLDOWN_S = 3600

/**
 * Sert sayfa tavanı. 200 × 50 = 10.000 beğeni kapsar.
 *
 * ⚠ Neden var: `next` alanı beklenmedik biçimde hep dolu gelirse döngü
 * sonsuza gider ve Spotify'ı dakikalarca döver — tam da 6,4 saatlik cezayı
 * doğuran senaryo. Tavan, hata durumunda **durmayı** garanti eder.
 */
const MAX_PAGES = 200

export type SyncLikedResult =
  | {
      ok: true
      /** Spotify'ın bildirdiği toplam beğeni sayısı. */
      spotifyTotal: number
      /** Yeni yazılan `liked` olayı (Rosso'da olmayanlar). */
      added: number
      /** Yeni yazılan `unliked` olayı (Spotify'da artık yok). */
      removed: number
      /** Katalogda olmadığı için `tracks`'e açılan kayıt. */
      catalogAdded: number
    }
  | { ok: false; reason: 'blocked'; retryAfterSeconds: number }
  | { ok: false; reason: 'no_token' | 'failed' | 'scope_missing'; status?: number }

interface SpotifyItem {
  added_at?: string
  track?: {
    id?: string
    name?: string
    artists?: Array<{ name?: string }>
    duration_ms?: number
    album?: { name?: string; images?: Array<{ url?: string; width?: number }> }
    external_ids?: { isrc?: string }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** §4.2 kural 3 — ortak Spotify havuzu bloklu mu? */
async function isBlocked(): Promise<{ blocked: boolean; remaining: number }> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('cooldown_get', { p_provider: PROVIDER })
  if (error || !data) return { blocked: false, remaining: 0 }

  const row = (data as Array<{ blocked_until: string | null }>)[0]
  if (!row?.blocked_until) return { blocked: false, remaining: 0 }

  const until = new Date(row.blocked_until).getTime()
  const remaining = Math.max(0, Math.round((until - Date.now()) / 1000))
  return { blocked: remaining > 0, remaining }
}

/** §4.2 kural 2 + 4 — cezayı DB'ye yaz; süre bilinmiyorsa 1 saat. */
async function writeCooldown(retryAfterSeconds: number | null): Promise<number> {
  const seconds =
    retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds : FALLBACK_COOLDOWN_S
  const supabase = await createServiceClient()
  await supabase.rpc('cooldown_set', {
    p_provider: PROVIDER,
    p_blocked_until: new Date(Date.now() + seconds * 1000).toISOString(),
    p_reason: 'liked_sync_429',
  })
  return seconds
}

/**
 * Spotify'daki TÜM beğenileri sayfalayarak çeker.
 *
 * ⚠ `added_at` şarkı başına gelir ve **beğenilme anıdır** — olay tablosuna
 * bunu yazarız, `now()` değil. Yoksa "ne zaman beğendim" bilgisi bugüne
 * çakılır ve Tozlu Raflar/Gözden Kaçanlar kovaları bozulur.
 */
async function fetchAllLiked(
  token: string,
  { maxPages = MAX_PAGES, gateMs = GATE_MS } = {},
): Promise<{ items: SpotifyItem[]; total: number } | { error: 'rate_limited' | 'failed'; status?: number }> {
  const items: SpotifyItem[] = []
  let total = 0
  let url: string | null = `https://api.spotify.com/v1/me/tracks?limit=${PAGE_SIZE}&offset=0`
  let page = 0

  while (url && page < maxPages) {
    // İLK sayfadan sonra her turda geçit (§4.2 kural 1).
    if (page > 0) await sleep(gateMs)

    try {
      const res: Response = await fetchWithRetry(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        // 403 = izin/allowlist sorunu; beklemek çözmez.
        if (res.status === 403) return { error: 'failed', status: 403 }
        return { error: 'failed', status: res.status }
      }

      const json = (await res.json()) as {
        items?: SpotifyItem[]
        total?: number
        next?: string | null
      }
      if (page === 0) total = json.total ?? 0
      items.push(...(json.items ?? []))
      url = json.next ?? null
      page++
    } catch (err) {
      if (err instanceof RateLimitedError) return { error: 'rate_limited' }
      return { error: 'failed' }
    }
  }

  return { items, total }
}

/**
 * Spotify'daki beğenileri Rosso ile karşılaştırır ve **farkı** olay olarak yazar.
 *
 * ⚠ Neden fark: `liked_songs_events` bir OLAY tablosu — durum değil geçmiş
 * tutar. Her senkronda 2.700 satır eklemek geçmişi çöple doldururdu.
 * `user_liked_track_ids` son olaydan güncel durumu türetiyor; biz yalnız
 * **değişeni** yazarız.
 *
 * ⚠ Katalogda olmayan şarkılar da `tracks`'e açılır. Sebep: `liked_songs_page`
 * RPC'si `tracks` ile join yapıyor — katalogda yoksa beğeni sayıya girer ama
 * LİSTEDE GÖRÜNMEZ (ölçüldü: 11 şarkı böyleydi, hiç dinlenmediği için
 * katalogda karşılığı yoktu).
 */
export async function syncLikedSongs(
  userId: string,
  /**
   * ⚠ YALNIZ TEST İÇİN. Üretimde hiçbir çağrı bunu geçmez — varsayılanlar
   * §4.2 sınırlarıdır. Testin 200 sayfa × 250ms = 50 sn beklemesi yerine
   * geçidi kısaltabilmesi için parametreleştirildi; davranış aynı kalır.
   */
  opts: { maxPages?: number; gateMs?: number } = {},
): Promise<SyncLikedResult> {
  const gate = await isBlocked()
  if (gate.blocked) {
    return { ok: false, reason: 'blocked', retryAfterSeconds: gate.remaining }
  }

  const token = await getSpotifyToken(userId)
  if (!token) return { ok: false, reason: 'no_token' }

  const fetched = await fetchAllLiked(token, opts)
  if ('error' in fetched) {
    if (fetched.error === 'rate_limited') {
      const secs = await writeCooldown(null)
      return { ok: false, reason: 'blocked', retryAfterSeconds: secs }
    }
    if (fetched.status === 403) {
      return { ok: false, reason: 'scope_missing', status: 403 }
    }
    return { ok: false, reason: 'failed', status: fetched.status }
  }

  const supabase = await createServiceClient()

  // Spotify'ın gerçeği: id → beğenilme anı
  const spotifyLiked = new Map<string, string>()
  for (const it of fetched.items) {
    const id = it.track?.id
    if (id) spotifyLiked.set(id, it.added_at ?? new Date().toISOString())
  }

  // ── Farkı DB HESAPLAR (CLAUDE.md §4.3) ─────────────────────────────────
  // ⚠ Karşılaştırmayı burada yapmak YASAK. `user_liked_track_ids` canlıda
  // 2.661 satır dönüyor; Supabase REST bunu **sessizce 1.000'e kırpar**
  // (ÖLÇÜLDÜ 2026-08-05: REST 1.000, DB 2.661). Kırpılmış listeyle
  // çalışılsaydı 1.661 şarkı "yeni beğeni" sanılıp mükerrer olay yazılacak,
  // `unliked` tarafı da yanlış kararlar üretecekti. Hata VERMEZ.
  //
  // ⚠⚠ Kırpma ÇIKTIDA da olur (0218, ölçüldü): RPC satır kümesi dönerken
  // sonuç yine 1.000'de kesiliyordu — tek id gönderilip 999 `remove` alındı,
  // oysa gerçek ~2.660'tı. Bu yüzden RPC artık **tek satır + dizi** döner;
  // tek satır kırpılamaz. Sözleşme: `to_add` / `to_remove` / `catalog_missing`.
  const { data: diff, error: diffError } = await supabase.rpc('liked_sync_diff', {
    p_user_id: userId,
    p_spotify_ids: [...spotifyLiked.keys()],
  })
  if (diffError) return { ok: false, reason: 'failed' }

  // `returns table (...)` tek satırlık küme döndürür → dizinin ilk elemanı.
  const fark = diff?.[0]
  if (!fark) return { ok: false, reason: 'failed' }

  const toAdd = fark.to_add ?? []
  const toRemove = fark.to_remove ?? []
  const katalogEksik = new Set(fark.catalog_missing ?? [])

  // ── Katalog: eksik şarkıları aç ────────────────────────────────────────
  // `catalog_missing` yukarıdaki RPC'den geldi — ayrı sorgu yok.
  //
  // ⚠ 0219: bu liste artık YALNIZ yeni beğenileri değil, Spotify'daki TÜM
  // beğeniler içinden katalogsuz olanları kapsar. Ölçüldü (2026-08-05):
  // ZIP'ten gelen 11 şarkının `tracks` karşılığı yoktu; `liked_songs_page`
  // JOIN yaptığı için sayıya girip LİSTEDE görünmüyorlardı (2.697 vs 2.686).
  // Bunlar hem Spotify'da hem Rosso'da beğenili olduğundan farka hiç
  // girmiyor, dolayısıyla eski `to_add` temelli filtre onları hiç görmezdi.
  let catalogAdded = 0
  if (katalogEksik.size > 0) {
    const eksik = fetched.items.filter((it) => it.track?.id && katalogEksik.has(it.track.id))

    if (eksik.length > 0) {
      // `title` ve `artists` NOT NULL — Spotify ikisini de veriyor.
      // Ad yoksa satırı hiç yazmayız; boş başlıklı katalog kaydı zarar verir.
      //
      // Toplu upsert YERİNE tek tek `resolveOrCreateTrackByIdentity`: aynı
      // ses kaydı (ISRC aynı) başka bir spotify_id ile katalogda zaten
      // varsa YENİ satır açmaz, kanonik satırı bulur — aksi halde single/
      // albüm varyantları (bkz. dosya başı ISRC notu) burada da çoğalırdı.
      for (const it of eksik) {
        if (!it.track?.id || !it.track.name) continue
        const id = await resolveOrCreateTrackByIdentity(supabase, {
          spotifyId: it.track.id,
          isrc: it.track.external_ids?.isrc ?? null,
          title: it.track.name,
          artists: (it.track.artists ?? []).map((a) => a.name ?? '').filter(Boolean),
          durationMs: it.track.duration_ms ?? null,
          album: it.track.album?.name ?? null,
        })
        if (id) catalogAdded += 1
      }
    }
  }

  // ── Olayları yaz ───────────────────────────────────────────────────────
  const olaylar = [
    ...toAdd.map((id) => ({
      user_id: userId,
      spotify_uri: `spotify:track:${id}`,
      event_type: 'liked',
      // Spotify'ın verdiği GERÇEK beğenilme anı — now() değil.
      occurred_at: spotifyLiked.get(id)!,
      platform: 'spotify',
    })),
    ...toRemove.map((id) => ({
      user_id: userId,
      spotify_uri: `spotify:track:${id}`,
      event_type: 'unliked',
      // Beğeniden çıkarma anını Spotify söylemiyor (listede yok artık),
      // bu yüzden "fark ettiğimiz an" yazılır. Tek dürüst damga bu.
      occurred_at: new Date().toISOString(),
      platform: 'spotify',
    })),
  ]

  if (olaylar.length > 0) {
    const { error } = await supabase.from('liked_songs_events').insert(olaylar)
    if (error) {
      // ⚠ Sessiz yutma YASAK. Bu satır önce çıplak `return failed` idi ve RLS
      // reddi (42501) hiçbir yere düşmüyordu: log `POST 200`, kullanıcı
      // "tazelenemedi", sebep GÖRÜNMEZ. Teşhis 3 tur gecikti.
      console.error('[sync-liked] olay yazilamadi:', {
        code: error.code,
        message: error.message,
        olaySayisi: olaylar.length,
      })
      return { ok: false, reason: 'failed' }
    }
  }

  return {
    ok: true,
    spotifyTotal: fetched.total,
    added: toAdd.length,
    removed: toRemove.length,
    catalogAdded,
  }
}
