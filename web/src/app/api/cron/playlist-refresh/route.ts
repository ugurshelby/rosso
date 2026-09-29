import { NextResponse, type NextRequest } from 'next/server'
import { runPlaylistRefresh } from '@/lib/services/playlist-refresh'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { PRIORITY_NORMAL } from '@/lib/spotify/api-gate'
import { recordSiraRun } from '@/lib/observability/pipeline-run'
import { siraylaIsle } from '@/lib/cron/kullanici-sirasi-db'

export const dynamic = 'force-dynamic'
/*
 * 60 → 300 (2026-09-23, 1000 kullanıcı ölçeği). Eskiden tek çağrıda tüm
 * bağlantılar; artık kayan sıra (0342), pg_cron 15 dakikada bir (0343).
 */
export const maxDuration = 300

const SURE_BUTCESI_MS = 240_000

/**
 * Kullanıcılar KENDİ app kotalarıyla çalışır (kota kapısı app başına), ama
 * `pacedFetch` süreç içinde istekleri 250 ms aralıkla dizer — yüksek
 * paralellik hız kazandırmaz. 3 işçi, biri Spotify'ı beklerken diğerinin
 * veritabanı yazmasını örtüştürmeye yeter.
 */
const ESZAMANLILIK = 3

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/playlist-refresh] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET missing' }, { status: 500 })
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 })
  }

  const startTime = Date.now()
  let playlistsUpdated = 0
  let playlistsDeleted = 0

  const sonuc = await siraylaIsle('playlist_refresh', {
    eszamanlilik: ESZAMANLILIK,
    baslangic: startTime,
    butceMs: SURE_BUTCESI_MS,
    isle: async (uid) => {
      const r = await runPlaylistRefresh(uid, { oncelik: PRIORITY_NORMAL })
      playlistsUpdated += r.playlistsUpdated
      playlistsDeleted += r.playlistsDeleted ?? 0
      /*
       * Kota kapısı kapalıysa (o app'in cezası / bütçesi) iş YAPILMADI —
       * tamamlandı sayılırsa kullanıcı 11 saat bekler. Hata olarak yazılır;
       * sıra onu geri çekilmeyle (5 dk → 6 sa) yeniden dener.
       */
      if (r.outcome === 'blocked' || r.outcome === 'skipped') {
        throw new Error(`kota kapısı: ${r.gateReason ?? r.outcome}`)
      }
      if (r.outcome === 'error') throw new Error('playlist tazeleme hatası')
    },
  })

  await recordSiraRun('playlist_refresh', sonuc, { playlistsUpdated, playlistsDeleted })

  return NextResponse.json({
    ok: true,
    usersProcessed: sonuc.islenen,
    usersFailed: sonuc.hatali,
    budgetExhausted: sonuc.butceDoldu,
    playlistsUpdated,
    playlistsDeleted,
    durationMs: Date.now() - startTime,
  })
}
