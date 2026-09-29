import { hataMetni } from '@/lib/utils/hata-metni'
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { systemLog } from '@/lib/observability/logger'
import { curateMoodPlaylistWithAi, validateAiSelection } from '@/lib/ai/gemini-client'
import { buildMoodAiContext, ADAY_HAVUZU_BOYUTU } from '@/lib/ai/mood-ai-context'
import { runCatalogEnrichment, type CatalogEnrichmentResult } from '@/lib/ai/catalog-enrichment'
import { runUserIntelligence, type UserIntelligenceResult } from '@/lib/ai/user-intelligence'
import { kuratorNotunuKaydet, runEditorial, type EditorialResult } from '@/lib/ai/editorial'
import { havuzlaCalistir, Semafor } from '@/lib/ai/concurrency'
import { siraylaIsle } from '@/lib/cron/kullanici-sirasi-db'
// enerjiEgrisiUygula: 0334'te devre dışı (bkz. aşağıdaki gerekçe). Modül duruyor.
import { MOOD_MIN_TRACKS, MOOD_TRACK_LIMIT, type MoodKey } from '@/lib/analytics/mood'
import {
  aiNegatifOrnekleri,
  aiPozitifOrnekSirasi,
  gecerliMoodEtiketi,
  type MoodEtiketi,
} from '@/lib/analytics/mood-etiket'

/**
 * Mood (an) listeleri paketi üretimi + haftalık Spotify senkronu.
 * `worker/app/pipeline/mood_pkg_runner.py` + `mood_weekly_sync_runner.py`'nin
 * TS portu (01-yillik-kontrolsuz-calisma-plani.md devamı, 2026-09-16).
 *
 * TAZELİK: B · Günlük. Kullanıcı başına 12 paket (`MOOD_KEYS`).
 *
 * ⚠ ANAHTARLAR `web/src/lib/analytics/mood.ts` → `MOODS` ile AYNI olmalı;
 * `build_mood_pkg` SQL fonksiyonu geçersiz anahtarı reddeder — ayrışma
 * sessiz kalmaz, RPC hata verir.
 *
 * ⚠ `/api/mood/create-playlist` PAKETE BAĞLI DEĞİLDİR (bilinçli, Python
 * yorumundan aynen taşındı): o uç kullanıcının Spotify hesabına GERÇEK
 * playlist yazıyor. Pakete bağlansaydı kullanıcı "şu an" değil "gece yarısı
 * üretilmiş" listeyi Spotify'a yazardı.
 *
 * 2026-09-18 katalog yeniden kurgusu (migration 0309/0310): 10→12 mood-key,
 * ek olarak `runYearPkg` (Your Years, statik yıllık arşiv) eklendi.
 */

const MOOD_KEYS = [
  'quiet_side',
  'full_throttle',
  'locked_in',
  'no_limit',
  'closer',
  'miles_away',
  'gece_217',
  'your_day',
  'first_light',
  'daylight',
  'dusk',
  'nocturne',
] as const

export interface MoodPkgResult {
  outcome: 'empty' | 'success' | 'partial' | 'error'
  usersProcessed: number
  moodsWritten: number
  skipped: number
  empty: number
  errors: number
  /** AI kürasyonuyla üretilen paket sayısı (geri kalanı SQL fallback). */
  aiCurated: number
  error?: string
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

/**
 * Eşzamanlılık sınırı — aynı anda kaç mood AI'a gidebilir.
 *
 * 🔴 ÖLÇÜLDÜ (2026-09-19): 12 mood `Promise.allSettled` ile AYNI ANDA
 * gönderiliyordu ve Vertex bir çağrıyı **429 RESOURCE_EXHAUSTED** ile
 * reddetti (`ai_generation_logs`'ta kayıtlı). O mood sessizce SQL fallback'ine
 * düştü — yani kullanıcı bir şey kaybetmedi ama kürasyon kalitesi düştü ve
 * daha kötüsü: her 429 devre kesici sayacını (günde 8 hata) artırıyor.
 * Arka arkaya birkaç tur böyle giderse AI kendini gereksiz yere kapatırdı.
 *
 * `rosso-ai-integration.md` revizyon §3B zaten bunu söylüyor:
 * *"concurrency = 3"*. Değer oradan alındı.
 */
const AI_ESZAMANLILIK = 3

/* `havuzlaCalistir` ayrı dosyada (`@/lib/ai/concurrency`) — saf mantık,
 * test edilebilir olsun diye. Bkz. o dosyanın başındaki 429 ölçümü. */

/**
 * Tek bir mood'u üretir: önce AI kürasyonu dener, olmazsa SQL'e düşer.
 *
 * 🔴 AI ASLA ZORUNLU DEĞİL (Sahip, 2026-09-18): `curateMoodPlaylistWithAi`
 * key yoksa / kota dolduysa / hata aldıysa `null` döner ve bu fonksiyon
 * sessizce `build_mood_pkg` (mevcut SQL yolu) ile devam eder. Kullanıcı
 * açısından tek fark listenin ne kadar "ince ayarlı" olduğudur.
 *
 * @param aiSonTarih Bu zamandan (epoch ms) sonra YENİ bir AI çağrısı
 *        başlatılmaz; mood doğrudan SQL yoluna düşer. Bkz. `AI_BASLATMA_PENCERESI_MS`.
 * @returns 'ai' | 'sql' | 'empty' — hangi yolla üretildiği (veya veri yok).
 */
async function buildSingleMood(
  supabase: ServiceClient,
  userId: string,
  moodKey: MoodKey,
  aiSonTarih?: number,
  aiSemafor?: Semafor,
): Promise<'ai' | 'sql' | 'empty'> {
  // Süre bütçesi dolduysa AI'a hiç girme — SQL yolu ~1 sn, AI ~7-30 sn.
  if (aiSonTarih !== undefined && Date.now() >= aiSonTarih) {
    return sqlIleUret(supabase, userId, moodKey)
  }

  // ── AI yolu ────────────────────────────────────────────────────────────
  try {
    const { data: havuz, error: havuzErr } = await supabase.rpc('mood_playlist', {
      p_user_id: userId,
      p_mood_key: moodKey,
      p_limit: ADAY_HAVUZU_BOYUTU,
    })
    if (havuzErr) throw havuzErr

    const adaylar = (havuz as Array<{
      track_id: string | null
      title: string | null
      artist_name: string | null
      play_count: number | string | null
    }> | null) ?? []

    if (adaylar.length > 0) {
      const [{ data: wsRow }, { data: pkgRow }, { data: etiketSatirlari }] = await Promise.all([
        supabase
          .from('mood_workspace')
          .select('hidden_track_ids, approved_track_ids')
          .eq('user_id', userId)
          .eq('mood_key', moodKey)
          .maybeSingle(),
        supabase.from('mood_pkg').select('payload').eq('user_id', userId).eq('mood_key', moodKey).maybeSingle(),
        // Uygunluk etiketleri (migration 0338). Okunamazsa boş: etiketsiz yol
        // bugünkü davranışın aynısı.
        supabase.from('mood_track_feedback').select('track_id, etiket').eq('user_id', userId).eq('mood_key', moodKey),
      ])

      const ws = wsRow as { hidden_track_ids?: string[]; approved_track_ids?: string[] } | null
      // HARD RULE listesi: bütün gizlenenler (etiketli ya da değil) —
      // `validateAiSelection` bunu kullanır, hiçbiri listeye giremez.
      const hiddenTrackIds = ws?.hidden_track_ids ?? []
      const etiketler = new Map<string, MoodEtiketi>()
      for (const s of (etiketSatirlari ?? []) as Array<{ track_id: string; etiket: string }>) {
        if (gecerliMoodEtiketi(s.etiket)) etiketler.set(s.track_id, s.etiket)
      }
      /*
       * 🔴 0338: modele gösterilen NEGATİF örnekler "Uygun, sevmedim"i İÇERMEZ.
       * O parça listeye AİT; yalnız kullanıcının zevkine uymuyor. Negatif
       * örnek yapılsaydı model "bu türden parça seçme" diye yanlış ders
       * çıkarırdı. Parça yine de seçilemez — yukarıdaki hard rule listesinde.
       */
      const ornekGizlenenler = aiNegatifOrnekleri(hiddenTrackIds, etiketler)
      // Kullanıcının temizlik turunda BIRAKTIĞI parçalar (migration 0326) —
      // prompt'ta pozitif örnek olarak kullanılır. Açık etiketler (çok sevdim,
      // uygun) öne: örnek listesi kırpıldığında önce onlar modele ulaşır.
      const approvedTrackIds = aiPozitifOrnekSirasi(ws?.approved_track_ids ?? [], etiketler)
      const previousTrackIds = (((pkgRow as { payload?: Array<{ track_id?: string }> } | null)?.payload ?? [])
        .map((t) => t.track_id)
        .filter((x): x is string => Boolean(x)))

      const context = await buildMoodAiContext({
        supabase,
        userId,
        moodKey,
        candidates: adaylar,
        hiddenTrackIds: ornekGizlenenler,
        approvedTrackIds,
        previousTrackIds,
        targetCount: MOOD_TRACK_LIMIT,
      })

      if (context) {
        // Semafor: paralel işlenen kullanıcıların AI çağrılarının TOPLAMI
        // sınırlı kalır (bkz. `Semafor` — Vertex 429 eşiği).
        const aiResult = aiSemafor
          ? await aiSemafor.calistir(() => curateMoodPlaylistWithAi(context))
          : await curateMoodPlaylistWithAi(context)
        if (aiResult) {
          // 1. bariyer (TS): halüsinasyon + hard rule temizliği.
          // ⚠ `MOOD_MIN_TRACKS`: tamamlama artık 50'ye DEĞİL tabana kadar —
          // modelin "burada yalnız 30 parça uyuyor" kararı iptal edilmiyor.
          const temiz = validateAiSelection(
            aiResult.selectedTrackIds,
            context.candidates,
            hiddenTrackIds,
            MOOD_TRACK_LIMIT,
            MOOD_MIN_TRACKS,
          )
          if (temiz.length > 0) {
            /*
             * 🔴 ENERJİ EĞRİSİ KALDIRILDI (2026-09-21, Sahibin talimatı):
             * *"mood listeleri oluşturulduktan sonra her zaman en çok
             * dinlenenden en az dinlenene doğru sıralansın kendi içinde"*
             *
             * §5.6'nın ısınma → zirve → dingin kapanış dizisi bununla
             * ÇELİŞİYOR; ikisi aynı anda mümkün değil ve talimat kazandı.
             * Sıraya artık `save_mood_pkg_payload` karar veriyor
             * (migration 0334: `ORDER BY play_count DESC, ord`) — yani
             * sıralama tek bir yerde, SQL'de yaşıyor. AI'ın işi hangi
             * parçaların GİRECEĞİNE karar vermek; sırayı belirlemek değil.
             *
             * `enerji-egrisi.ts` ve testleri bilinçli olarak SİLİNMEDİ:
             * ileride "dizi modu" bir kullanıcı seçeneği olarak geri
             * gelebilir, o gün sıfırdan yazılmasın.
             */
            const sirali = temiz
            // 2. bariyer (SQL): hidden_track_ids YENİDEN filtrelenir.
            const { data: yazildi } = await supabase.rpc('save_mood_pkg_payload', {
              p_user_id: userId,
              p_mood_key: moodKey,
              p_track_ids: sirali,
            })
            if (yazildi === true) {
              // Liner Notes: not listeyle birlikte değişir (yoksa eskisi silinir).
              await kuratorNotunuKaydet(supabase, userId, moodKey, aiResult.curatorNote ?? null, sirali)
              return 'ai'
            }
          }
        }
      }
    }
  } catch (err) {
    // AI yolundaki HİÇBİR hata turu bozmaz — sessizce SQL'e düşülür.
    void systemLog({
      operation: 'mood_ai_curation',
      userId,
      severity: 'warn',
      errorMessage: `mood=${moodKey} AI yolu atlandı: ${hataMetni(err)}`,
    })
  }

  return sqlIleUret(supabase, userId, moodKey)
}

/** SQL fallback (mevcut `build_mood_pkg` yolu, değişmedi). */
async function sqlIleUret(
  supabase: ServiceClient,
  userId: string,
  moodKey: MoodKey,
): Promise<'sql' | 'empty'> {
  const { data, error } = await supabase.rpc('build_mood_pkg', {
    p_user_id: userId,
    p_mood_key: moodKey,
  })
  if (error) throw error
  if (data === false) return 'empty'
  // SQL listesi değişti → AI'ın eski liste için yazdığı küratör notu artık geçersiz.
  await kuratorNotunuKaydet(supabase, userId, moodKey, null)
  return 'sql'
}

export { hataMetni }

export interface KullaniciMoodSonucu {
  moodsWritten: number
  skipped: number
  empty: number
  errors: number
  aiCurated: number
}

/**
 * TEK kullanıcının 12 mood paketini üretir (kayan sıranın iş birimi, 0342).
 *
 * Eskiden `runMoodPkg` tüm kullanıcıları tek döngüde, user_id sırasıyla
 * geziyordu ve AI penceresi (150 sn) HEPSİNE ortaktı: kullanıcı sayısı
 * arttıkça listenin sonundakiler her gün AI'sız (SQL) kalırdı. Artık her
 * cron çağrısı sıradan en eski kullanıcıyı alır; AI penceresi yalnız o
 * çağrının kullanıcılarına bölünür.
 *
 * Mood'ların HİÇBİRİ yazılamadıysa fırlatır — sıra kullanıcıyı geri
 * çekilmeyle yeniden dener. Kısmi hata (bazı mood'lar) başarı sayılır;
 * hatalı mood'lar systemLog'a düşer ve ertesi gün yeniden denenir.
 */
export async function kullanicininMoodlariniUret(
  supabase: ServiceClient,
  uid: string,
  force = false,
  aiSonTarih?: number,
  aiSemafor?: Semafor,
): Promise<KullaniciMoodSonucu> {
  const sonuc: KullaniciMoodSonucu = { moodsWritten: 0, skipped: 0, empty: 0, errors: 0, aiCurated: 0 }

  /*
   * Katman B davranış metrikleri (§4.1, migration 0315) — SAF SQL, AI YOK,
   * maliyet sıfır. Mood kürasyonundan ÖNCE çalışır ki AI context'i taze
   * metrikleri okusun. Hatası turu bozmaz: metrikler eskir, o kadar.
   */
  try {
    await supabase.rpc('compute_user_music_metrics', { p_user_id: uid })
  } catch (err) {
    void systemLog({
      operation: 'user_music_metrics',
      userId: uid,
      severity: 'warn',
      errorMessage: hataMetni(err),
    })
  }

  // ⚠ Mood-içi paralellik SINIRLI (`AI_ESZAMANLILIK`); kullanıcılar arası
  // toplam AI yükünü ayrıca `aiSemafor` sınırlar.
  const results = await havuzlaCalistir(MOOD_KEYS, AI_ESZAMANLILIK, async (moodKey) => {
    /*
     * DAVRANIŞ FRENİ (Sahip, 2026-09-18 §4): kullanıcı bu mood'da
     * hiçbir şey yapmadıysa (şarkı çıkarmadı, yeni dinleme yok) ve
     * paket 7 günden yeniyse — NE AI NE SQL çalışır, pakete hiç
     * dokunulmaz. Hem gereksiz kaymayı hem Gemini kotasını korur.
     */
    if (!force) {
      const { data: gerekli } = await supabase.rpc('mood_needs_ai_recuration', {
        p_user_id: uid,
        p_mood_key: moodKey,
      })
      if (gerekli === false) return { moodKey, outcome: 'skipped' as const }
    }

    const outcome = await buildSingleMood(supabase, uid, moodKey as MoodKey, aiSonTarih, aiSemafor)
    return { moodKey, outcome }
  })

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { outcome } = result.value
      if (outcome === 'skipped') {
        sonuc.skipped += 1
      } else if (outcome === 'empty') {
        sonuc.empty += 1
      } else {
        sonuc.moodsWritten += 1
        if (outcome === 'ai') sonuc.aiCurated += 1
      }
    } else {
      sonuc.errors += 1
      void systemLog({
        operation: 'mood_pkg',
        userId: uid,
        severity: 'warn',
        errorMessage: hataMetni(result.reason),
      })
    }
  }

  if (sonuc.errors > 0 && sonuc.moodsWritten === 0 && sonuc.skipped === 0 && sonuc.empty === 0) {
    throw new Error(`mood_pkg: ${sonuc.errors} mood'un hiçbiri üretilemedi`)
  }
  return sonuc
}

// ─────────────────────── haftalık Spotify senkronu ───────────────────────

/** Spotify tek istekte max 100 URI kabul eder (replace dahil). */
const MAX_TRACKS_PER_REPLACE = 100

export interface MoodWeeklySyncResult {
  outcome: 'empty' | 'success' | 'partial' | 'error'
  synced: number
  skipped: number
  errors: number
  error?: string
}

/**
 * Senkron açık mood'ların Spotify playlist'ini taze pakete göre günceller.
 * `mood_pkg_runner`'dan SONRA çalışmalı (paket taze olmalı) — bkz. `runMoodTuru`.
 */
export async function runMoodWeeklySync(userId?: string): Promise<MoodWeeklySyncResult> {
  const supabase = await createServiceClient()

  let candidates: Array<{ user_id: string; mood_key: string; exported_playlist_id: string }>
  try {
    if (userId) {
      /*
       * Kayan sıra (0342): senkron artık o kullanıcının mood'larıyla BİRLİKTE,
       * paketi tazelendiği anda çalışır. Tüm kullanıcıların adaylarını her
       * çağrıda çekmek 1000 kullanıcıda gereksiz yük olurdu.
       */
      const { data, error } = await supabase
        .from('mood_workspace')
        .select('user_id, mood_key, exported_playlist_id')
        .eq('user_id', userId)
        .eq('weekly_sync_enabled', true)
        .not('exported_playlist_id', 'is', null)
      if (error) throw error
      candidates = (data as typeof candidates | null) ?? []
    } else {
      const { data, error } = await supabase.rpc('get_mood_weekly_sync_candidates')
      if (error) throw error
      candidates = (data as typeof candidates | null) ?? []
    }
  } catch (err) {
    return { outcome: 'error', synced: 0, skipped: 0, errors: 0, error: hataMetni(err) }
  }

  if (candidates.length === 0) {
    return { outcome: 'empty', synced: 0, skipped: 0, errors: 0 }
  }

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const row of candidates) {
    const { user_id: userId, mood_key: moodKey, exported_playlist_id: playlistId } = row
    if (!userId || !moodKey || !playlistId) {
      skipped += 1
      continue
    }

    try {
      const { data: pkg } = await supabase
        .from('mood_pkg')
        .select('payload')
        .eq('user_id', userId)
        .eq('mood_key', moodKey)
        .maybeSingle()

      const payload = (pkg?.payload as Array<{ spotify_id?: string }> | null) ?? []
      const spotifyIds = payload.map((t) => t.spotify_id).filter((v): v is string => Boolean(v))

      if (spotifyIds.length === 0) {
        skipped += 1
        continue
      }

      // ⚠ Kırpma YASAK — sınır aşılırsa hiç yazma, görünür şekilde atla
      // (eksik şarkı yazıp "senkronlandı" demektense).
      if (spotifyIds.length > MAX_TRACKS_PER_REPLACE) {
        skipped += 1
        void systemLog({
          operation: 'mood_weekly_sync',
          userId,
          severity: 'warn',
          errorMessage: `mood=${moodKey} track_count=${spotifyIds.length} > ${MAX_TRACKS_PER_REPLACE} — atlandı`,
        })
        continue
      }

      const token = await ensureValidToken(userId, 'spotify')
      if (!token) {
        skipped += 1
        continue
      }

      const uris = spotifyIds.map((sid) => `spotify:track:${sid}`)
      const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris }),
        signal: AbortSignal.timeout(15_000),
      })

      if (!res.ok) {
        errors += 1
        const govde = await res.text().then((t) => t.slice(0, 160)).catch(() => '')
        void systemLog({
          operation: 'mood_weekly_sync',
          userId,
          severity: 'warn',
          errorMessage: `mood=${moodKey} Spotify PUT ${res.status}${govde ? ` — ${govde}` : ''}`,
        })
        continue
      }

      synced += 1
    } catch (err) {
      errors += 1
      void systemLog({
        operation: 'mood_weekly_sync',
        userId,
        severity: 'warn',
        errorMessage: `mood=${moodKey}: ${hataMetni(err)}`,
      })
    }
  }

  const outcome: MoodWeeklySyncResult['outcome'] =
    synced === 0 && errors > 0 ? 'error' : errors > 0 ? 'partial' : synced === 0 ? 'empty' : 'success'

  return { outcome, synced, skipped, errors }
}

// ─────────────────────────── Your Years ───────────────────────────

export interface YearPkgResult {
  outcome: 'empty' | 'success' | 'partial' | 'error'
  usersChecked: number
  yearsWritten: number
  errors: number
  error?: string
}

/**
 * Tamamlanmış her yıl için `year_pkg` üretir (yoksa). `build_year_pkg`
 * zaten var olan yılda `false` döner — bu fonksiyon her gün çağrılsa da
 * idempotent ve ucuz, fazladan iş yalnız yeni yıl geçişinde olur.
 *
 * Kapak üretimi (`generateYearCover`) yalnız YENİ üretilen yıllarda
 * tetiklenir — var olan/donmuş yıllara asla dokunulmaz.
 */
export async function runYearPkg(userIds: string[]): Promise<YearPkgResult> {
  const supabase = await createServiceClient()
  let yearsWritten = 0
  let errors = 0

  for (const uid of userIds) {
    try {
      const { data: years, error } = await supabase.rpc('completed_years_for_user', { p_user_id: uid })
      if (error) throw error
      for (const year of (years as number[] | null) ?? []) {
        const { data: built, error: buildErr } = await supabase.rpc('build_year_pkg', {
          p_user_id: uid,
          p_year: year,
        })
        if (buildErr) throw buildErr
        if (built) {
          yearsWritten += 1
          try {
            const { generateYearCover } = await import('@/lib/playlists/year-cover-generate')
            const coverUrl = await generateYearCover(year)
            if (coverUrl) {
              await supabase.from('year_pkg').update({ cover_url: coverUrl }).eq('user_id', uid).eq('year', year)
            }
          } catch (coverErr) {
            void systemLog({
              operation: 'year_pkg_cover',
              userId: uid,
              severity: 'warn',
              errorMessage: `year=${year}: ${hataMetni(coverErr)}`,
            })
          }
        }
      }
    } catch (err) {
      errors += 1
      void systemLog({
        operation: 'year_pkg',
        userId: uid,
        severity: 'warn',
        errorMessage: hataMetni(err),
      })
    }
  }

  const outcome: YearPkgResult['outcome'] =
    errors > 0 && yearsWritten === 0 ? 'error' : errors > 0 ? 'partial' : yearsWritten === 0 ? 'empty' : 'success'

  return { outcome, usersChecked: userIds.length, yearsWritten, errors }
}

/**
 * Mood turu — kayan sıra (0342). Bir cron çağrısının gövdesi.
 *
 * KULLANICI BİRİMİ (sıradan alınan her kullanıcı için, bu sırayla):
 *   mood paketleri → o kullanıcının Spotify senkronu → yıllık paket.
 *   Senkron TAZE pakete göre çalışmalı (ters sırada dünün paketi yazılırdı).
 * TUR SONU (bu çağrıda işlenen kullanıcılar için, kalan bütçeyle):
 *   semantik profil (aylık) → editoryal → katalog zenginleştirme → log temizliği.
 *
 * Her adımın hatası bir sonrakini bozmaz. Yetişemeyen kullanıcı bir sonraki
 * çağrıda sıranın başına geçer.
 *
 * @param force Davranış frenini atla ve aralığı yok say (denetim/ölçüm,
 *        `?force=1`). Normal cron `false` geçer.
 */
export async function runMoodTuru(force = false): Promise<{
  moodPkg: MoodPkgResult
  yearPkg: YearPkgResult
  weeklySync: MoodWeeklySyncResult
  userIntelligence: UserIntelligenceResult | null
  catalogEnrichment: CatalogEnrichmentResult | null
  editorial: EditorialResult | null
  budgetExhausted: boolean
}> {
  const turBaslangici = Date.now()
  /* 280 sn: route `maxDuration` 300'ün altında güvenlik payı. */
  const CRON_BUTCESI_MS = 280_000
  /*
   * YENİ kullanıcı alma sınırı. Bir kullanıcının en kötü süresi ölçüldü:
   * 12 mood × 10,4 sn ÷ eşzamanlılık 3 ≈ 42 sn (+ senkron/yıllık ~5 sn).
   * 170 sn'de alınan son kullanıcı ~215 sn'de biter; kalan ~65 sn tur sonu
   * adımlarına (semantik profil, editoryal, katalog) kalır.
   */
  const KULLANICI_ALMA_BUTCESI_MS = 170_000
  /*
   * YENİ AI çağrısı başlatma sınırı. Kullanıcı alma sınırından SONRA:
   * sınırdan hemen önce alınan kullanıcının mood'ları da AI alabilsin.
   * (Eski tasarımda pencere tüm kullanıcılara ortaktı ve sondakiler hep
   * SQL'e düşüyordu — kayan sırada her kullanıcı bir çağrının İÇİNDE,
   * pencerenin başında işlenir.)
   */
  const AI_BASLATMA_PENCERESI_MS = 215_000
  /*
   * İki kullanıcı paralel. AI'ın TOPLAM eşzamanlılığı `aiSemafor` ile 3'te
   * kalır (Vertex 429 ölçümü); paralellik, bir kullanıcı SQL/Spotify
   * adımındayken diğerinin AI kullanmasını sağlar.
   *
   * KAPASİTE: AI bağlı ≈ 3 eşzamanlı × 170 sn ÷ ~5 sn ≈ 100 AI çağrısı/çağrı
   * ≈ 8 tam kullanıcı (12 mood'un hepsi AI isterse). Davranış freni aktif
   * olmayan kullanıcıların mood'larını atladığı için gerçek sayı daha
   * yüksek. Cron 10 dakikada bir (0343) → günde ≥ 1150 kullanıcı.
   */
  const KULLANICI_ESZAMANLILIK = 2
  const aiSemafor = new Semafor(AI_ESZAMANLILIK)

  const supabase = await createServiceClient()
  const moodPkg: MoodPkgResult = {
    outcome: 'empty', usersProcessed: 0, moodsWritten: 0, skipped: 0, empty: 0, errors: 0, aiCurated: 0,
  }
  const weeklySync: MoodWeeklySyncResult = { outcome: 'empty', synced: 0, skipped: 0, errors: 0 }
  const yearPkg: YearPkgResult = { outcome: 'empty', usersChecked: 0, yearsWritten: 0, errors: 0 }
  const islenenKullanicilar: string[] = []

  const sira = await siraylaIsle('mood_pkg', {
    eszamanlilik: KULLANICI_ESZAMANLILIK,
    baslangic: turBaslangici,
    butceMs: KULLANICI_ALMA_BUTCESI_MS,
    zorla: force,
    isle: async (uid) => {
      const m = await kullanicininMoodlariniUret(
        supabase, uid, force, turBaslangici + AI_BASLATMA_PENCERESI_MS, aiSemafor,
      )
      moodPkg.moodsWritten += m.moodsWritten
      moodPkg.skipped += m.skipped
      moodPkg.empty += m.empty
      moodPkg.errors += m.errors
      moodPkg.aiCurated += m.aiCurated
      if (m.moodsWritten > 0) moodPkg.usersProcessed += 1
      islenenKullanicilar.push(uid)

      try {
        const w = await runMoodWeeklySync(uid)
        weeklySync.synced += w.synced
        weeklySync.skipped += w.skipped
        weeklySync.errors += w.errors
      } catch (err) {
        weeklySync.errors += 1
        void systemLog({
          operation: 'mood_weekly_sync',
          userId: uid,
          severity: 'error',
          errorMessage: `mood_weekly_sync başarısız — mood paketi etkilenmedi: ${hataMetni(err)}`,
        })
      }

      const y = await runYearPkg([uid])
      yearPkg.usersChecked += y.usersChecked
      yearPkg.yearsWritten += y.yearsWritten
      yearPkg.errors += y.errors
    },
  })

  moodPkg.errors += sira.hatali
  moodPkg.outcome =
    moodPkg.moodsWritten === 0 && moodPkg.errors > 0
      ? 'error'
      : moodPkg.errors > 0
        ? 'partial'
        : moodPkg.moodsWritten === 0
          ? 'empty'
          : 'success'
  weeklySync.outcome =
    weeklySync.synced === 0 && weeklySync.errors > 0 ? 'error' : weeklySync.errors > 0 ? 'partial' : weeklySync.synced === 0 ? 'empty' : 'success'
  yearPkg.outcome =
    yearPkg.errors > 0 && yearPkg.yearsWritten === 0 ? 'error' : yearPkg.errors > 0 ? 'partial' : yearPkg.yearsWritten === 0 ? 'empty' : 'success'

  const kalan = () => CRON_BUTCESI_MS - (Date.now() - turBaslangici)

  /*
   * KATMAN B SEMANTİK PROFİL (§4.2) — ayda 1, kullanıcı başına. Yalnız bu
   * çağrıda işlenen kullanıcılar; çoğu çağrıda no-op.
   */
  let userIntelligence: UserIntelligenceResult | null = null
  if (islenenKullanicilar.length > 0) {
    try {
      userIntelligence = await runUserIntelligence(islenenKullanicilar, kalan())
    } catch (err) {
      void systemLog({
        operation: 'user_music_intelligence',
        severity: 'warn',
        errorMessage: `semantik profil basarisiz — tur etkilenmedi: ${hataMetni(err)}`,
      })
    }
  }

  /*
   * KATMAN D EDİTORYAL (§6) — hash kapılı, çoğu turda no-op. Bütçenin son
   * 6 sn'sini ASLA yemez; en fazla 40 sn.
   */
  let editorial: EditorialResult | null = null
  if (islenenKullanicilar.length > 0) {
    try {
      editorial = await runEditorial(islenenKullanicilar, Math.min(kalan() - 6_000, 40_000))
    } catch (err) {
      void systemLog({
        operation: 'editorial',
        severity: 'warn',
        errorMessage: `editoryal tur basarisiz — tur etkilenmedi: ${hataMetni(err)}`,
      })
    }
  }

  /*
   * KATALOG ZENGİNLEŞTİRME — turun EN SONU, artakalan bütçeyle. Kendi günlük
   * kota sayacı var (`catalog_enrichment`), mood kotasını YEMEZ.
   */
  let catalogEnrichment: CatalogEnrichmentResult | null = null
  try {
    catalogEnrichment = await runCatalogEnrichment(kalan())
  } catch (err) {
    void systemLog({
      operation: 'catalog_enrichment',
      severity: 'warn',
      errorMessage: `katalog zenginlestirme basarisiz — tur etkilenmedi: ${hataMetni(err)}`,
    })
  }

  /*
   * LOG SAKLAMA — `ai_generation_logs` sınırsız büyürse bir gün YAZMA hatası
   * verir ve bu sessizce AI turunu bozar (Supabase free tier disk sınırı).
   * 90 günden eskiyi siler; her çağrıda koşar (indeksli silme, çoğunlukla
   * 0 satır — ucuz). Hatası hiçbir şeyi etkilemez.
   */
  try {
    await supabase.rpc('ai_generation_logs_temizle', { p_gun: 90 })
  } catch {
    /* temizlik ikincil — turu bozmaz */
  }

  return {
    moodPkg,
    weeklySync,
    yearPkg,
    userIntelligence,
    catalogEnrichment,
    editorial,
    budgetExhausted: sira.butceDoldu,
  }
}
