import { NextResponse, type NextRequest } from 'next/server'
import { runCatalogEnrichment } from '@/lib/ai/catalog-enrichment'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { recordPipelineRun } from '@/lib/observability/pipeline-run'

export const dynamic = 'force-dynamic'

/**
 * 🔴 NEDEN AYRI ROTA (2026-09-20 mood kalite denetimi).
 *
 * Katalog zenginleştirmesi `/api/cron/mood-pkg` turunun EN SONUNDA, artakalan
 * bütçeyle çalışıyordu. O rotanın `maxDuration` değeri 60 sn ve kullanıcıya
 * dokunan adımlar (mood paketi ~12 sn + Spotify senkronu + yıllıklar +
 * editoryal) bitince geriye tipik olarak bir-iki batch'lik süre kalıyordu.
 * ÖLÇÜLDÜ: günde en fazla ~40 öğe işleniyordu; mood adayı olabilecek 6.706
 * parçanın yalnız 459'u (%7) etiketliydi.
 *
 * Aynı ölçümde etiketsizlik doğrudan kalite kaybı olarak göründü: kullanıcının
 * elle temizlediği 350 parçada metaverisi OLMAYANLAR %68,5, parça bazlı
 * etiketi olanlar %50,3 oranında çıkarılmıştı.
 *
 * Bu rota işi mood turundan ayırır: 300 sn'lik kendi penceresinde ~20 batch
 * geçirir. Mood turundaki artakalan-bütçe yolu KALDIRILMADI (yedek olarak
 * duruyor); ikisi aynı günlük kota sayacını (`ai_usage_counter`) paylaşır,
 * yani toplam maliyet iki katına ÇIKMAZ.
 *
 * Sıfır maliyet disiplini: 7/24 açık konteyner yok, günde bir kez ~4 dakika
 * çalışan bir serverless fonksiyon. Kuyruk kapandığında (0327 havuz tavanları:
 * 800 sanatçı / 3.500 parça) aday kalmaz ve tur no-op'a döner.
 */
export const maxDuration = 300

/** Fonksiyon tavanının altında bir pencere — kesilme yerine düzgün bitiş. */
const SURE_PENCERESI_MS = 280_000

/** Bir turda en fazla kaç AI çağrısı (ölçülen batch gecikmesi ~12 sn). */
const TUR_BASINA_CAGRI = 20

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/catalog-enrichment] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET missing' }, { status: 500 })
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 })
  }

  const startTime = Date.now()
  try {
    const result = await runCatalogEnrichment(SURE_PENCERESI_MS, TUR_BASINA_CAGRI)
    await recordPipelineRun({
      runType: 'catalog_enrichment',
      outcome: 'success',
      stats: { ...(result as unknown as Record<string, unknown>), durationMs: Date.now() - startTime },
    })
    return NextResponse.json({ ok: true, catalogEnrichment: result, durationMs: Date.now() - startTime })
  } catch (err) {
    console.error('[cron/catalog-enrichment] Unexpected error:', err)
    await recordPipelineRun({
      runType: 'catalog_enrichment',
      outcome: 'error',
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
