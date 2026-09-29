import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncRecentlyPlayed } from '@/lib/services/spotify-sync-recently-played'
import { refreshUserCorePackages } from '@/lib/services/user-packages-refresh'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { siraylaIsle } from '@/lib/cron/kullanici-sirasi-db'
import { recordSiraRun } from '@/lib/observability/pipeline-run'

export const dynamic = 'force-dynamic'
/*
 * 300 sn tavan; asıl sınır `SURE_BUTCESI_MS`. ÖLÇÜLDÜ: kullanıcı başına
 * 6,4–19,2 sn (canlı net._http_response, 2026-09-23).
 */
export const maxDuration = 300

/**
 * Bu süre dolunca YENİ kullanıcı alınmaz; en yavaş ölçülen kullanıcı (~19 sn)
 * bittikten sonra bile `maxDuration`'a dayanmaz.
 */
const SURE_BUTCESI_MS = 240_000

/**
 * Aynı anda kaç kullanıcı. Her kullanıcı KENDİ Spotify app'inin kotasını
 * kullanır (BYOC) — paralellik bir app'i daha hızlı yormaz; paylaşılan app'le
 * bağlı kullanıcılar zaten tek kişi (Sahip).
 *
 * KAPASİTE: 6 işçi × 240 sn ÷ ~10 sn ≈ 140 kullanıcı/çağrı; cron 5 dakikada
 * bir (0343) → saatte ~1700 kullanıcı. 1000 kullanıcının saatlik senkronu
 * %40 payla sığar.
 */
const ESZAMANLILIK = 6

/**
 * Çekirdek paketler (istatistik/desen/dönem/zevk/şeritler) en fazla bu
 * sıklıkla yeniden kurulur. Eskiden yeni dinleme gelen HER saatte, zevk
 * profili dahil (`force`) kuruluyordu — tek kullanıcıda turun 19 sn'sinin
 * çoğu buydu. 1000 kullanıcıda bu, veritabanını saatin tamamında meşgul
 * ederdi. Ekran tazeliği için 3 saat yeterli; tam kurulum zaten günlük
 * `refresh_active_users_batch` turunda.
 */
const CEKIRDEK_PAKET_ARALIGI_MS = 3 * 60 * 60 * 1000

/**
 * Supabase pg_cron → Spotify canlı dinleme senkronu (kayan sıra, 0342).
 *
 * Her çağrı vadesi gelmiş (son senkronu 50 dk'dan eski) kullanıcıları EN
 * ESKİDEN başlayarak alır; bütçe dolunca durur. Yetişemeyen kullanıcı bir
 * sonraki çağrıda başa geçer. Kullanıcı kümesi (aktif bağlantı, test değil,
 * allowlist onaylı) SQL'de: `cron_uygun_kullanicilar('spotify_sync')`.
 *
 * Security: Bearer CRON_SECRET (veya WORKER_SHARED_SECRET).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/sync-spotify] Server misconfiguration: CRON_SECRET is missing.')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing' },
      { status: 500 }
    )
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  const supabase = await createServiceClient()

  /*
   * 429 KAPSAMI APP BAŞINA. Spotify kotası client_id başınadır: A'nın kendi
   * app'i 429 yerse B'nin app'i etkilenmez. Bu çağrıda 429 alan app'in diğer
   * kullanıcıları atlanır (hata olarak yazılır → sıra onları geri çekilmeyle
   * sonra dener). `oauth_client_id` NULL (0341 öncesi) = paylaşılan app.
   */
  const paylasilanId = process.env.SPOTIFY_CLIENT_ID ?? 'paylasilan'
  const kotasiDolanApp = new Set<string>()
  let toplamOlay = 0

  const sonuc = await siraylaIsle('spotify_sync', {
    eszamanlilik: ESZAMANLILIK,
    baslangic: startTime,
    butceMs: SURE_BUTCESI_MS,
    isle: async (userId) => {
      const { data: baglanti } = await supabase
        .from('platform_connections')
        .select('oauth_client_id')
        .eq('user_id', userId)
        .eq('platform', 'spotify')
        .maybeSingle()
      const appAnahtari = baglanti?.oauth_client_id ?? paylasilanId
      if (kotasiDolanApp.has(appAnahtari)) {
        throw new Error('Aynı Spotify app bu turda 429 aldı — atlandı')
      }

      const syncRes = await syncRecentlyPlayed(userId, { force: true })

      if (syncRes.outcome === 'rate_limited') {
        kotasiDolanApp.add(appAnahtari)
        throw new Error('Spotify rate limited (429)')
      }
      if (syncRes.outcome === 'error') {
        throw new Error(syncRes.error ?? 'senkron hatası')
      }

      toplamOlay += syncRes.eventsWritten
      if (syncRes.eventsWritten > 0) {
        await cekirdekPaketleriGerekirseTazele(supabase, userId)
      }
    },
  })

  await recordSiraRun('spotify_recently_played', sonuc, { totalEventsWritten: toplamOlay })

  return NextResponse.json({
    ok: true,
    usersProcessed: sonuc.islenen,
    usersFailed: sonuc.hatali,
    budgetExhausted: sonuc.butceDoldu,
    totalEventsWritten: toplamOlay,
    durationMs: Date.now() - startTime,
    results: sonuc.ayrinti,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}

type ServisIstemcisi = Awaited<ReturnType<typeof createServiceClient>>

/**
 * Çekirdek paketleri en fazla `CEKIRDEK_PAKET_ARALIGI_MS`'de bir kurar.
 * Damga, kayan sıra tablosunda 'cekirdek_paket' satırı olarak tutulur (ayrı
 * tablo açmaya değmez; aynı "bu kullanıcı için en son ne zaman" sorusu).
 * Hata turu bozmaz — paketler bir sonraki fırsatta kurulur.
 */
async function cekirdekPaketleriGerekirseTazele(
  supabase: ServisIstemcisi,
  userId: string,
): Promise<void> {
  try {
    const { data: damga } = await supabase
      .from('cron_kullanici_sirasi')
      .select('son_tamamlanma')
      .eq('is_adi', 'cekirdek_paket')
      .eq('user_id', userId)
      .maybeSingle()
    const son = damga?.son_tamamlanma ? new Date(damga.son_tamamlanma).getTime() : 0
    if (Date.now() - son < CEKIRDEK_PAKET_ARALIGI_MS) return

    await refreshUserCorePackages(userId)
    await supabase.from('cron_kullanici_sirasi').upsert(
      {
        is_adi: 'cekirdek_paket',
        user_id: userId,
        son_tamamlanma: new Date().toISOString(),
        guncellendi: new Date().toISOString(),
      },
      { onConflict: 'is_adi,user_id' },
    )
  } catch (err) {
    console.warn(`[cron/sync-spotify] Core packages refresh warning for ${userId}:`, err)
  }
}
