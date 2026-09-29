import { NextResponse, type NextRequest } from 'next/server'
import { generateUserRecaps } from '@/lib/services/recap-generator'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { recordSiraRun } from '@/lib/observability/pipeline-run'
import { siraylaIsle } from '@/lib/cron/kullanici-sirasi-db'

export const dynamic = 'force-dynamic'
/*
 * 60 → 300 (2026-09-23, 1000 kullanıcı ölçeği). Eskiden tek çağrıda TÜM
 * kullanıcılar işleniyordu; 60 sn'de kesilen hep aynı kullanıcılardı
 * (sıra `recap_user_ids`'e bağlıydı). Artık kayan sıra (0342): asıl sınır
 * `SURE_BUTCESI_MS`, pg_cron 30 dakikada bir çağırır (0343).
 */
export const maxDuration = 300

/** Bu süre dolunca yeni kullanıcı alınmaz. */
const SURE_BUTCESI_MS = 240_000

/**
 * Recap üretimi saf SQL + AI yok; kullanıcılar birbirinden bağımsız.
 * KAPASİTE: 4 × 240 sn ÷ ~3 sn ≈ 300 kullanıcı/çağrı; 30 dakikada bir →
 * günde 48 çağrı. 1000 kullanıcının günlük turu ilk birkaç çağrıda biter.
 */
const ESZAMANLILIK = 4

/**
 * Autonomous Recap Generation & Freezing Endpoint.
 *
 * Triggered by Supabase pg_cron (rosso-recap-cron).
 * Analyzes completed listening periods and freezes card payloads into public.recaps.
 * Kullanıcı kümesi SQL'de: `cron_uygun_kullanicilar('recap')`.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/recap] Server misconfiguration: CRON_SECRET missing.')
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
  let totalRecapsWritten = 0

  const sonuc = await siraylaIsle('recap', {
    eszamanlilik: ESZAMANLILIK,
    baslangic: startTime,
    butceMs: SURE_BUTCESI_MS,
    isle: async (uid) => {
      const res = await generateUserRecaps(uid)
      totalRecapsWritten += res.recapsWritten
      // Kısmi hata (bazı dönemler) başarı sayılır; hiçbir şey yazılamadı ve
      // hata varsa sıra kullanıcıyı geri çekilmeyle yeniden dener.
      if (res.errors.length > 0 && res.recapsWritten === 0) {
        throw new Error(res.errors.join('; ').slice(0, 400))
      }
    },
  })

  await recordSiraRun('recap_refresh', sonuc, { totalRecapsWritten })

  return NextResponse.json({
    ok: true,
    usersCount: sonuc.islenen + sonuc.hatali,
    usersFailed: sonuc.hatali,
    budgetExhausted: sonuc.butceDoldu,
    totalRecapsWritten,
    results: sonuc.ayrinti,
    durationMs: Date.now() - startTime,
  })
}
