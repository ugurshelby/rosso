import type { ExportJobState } from '@/lib/export/use-export-progress'
import { progressPercent } from '@/lib/export/use-export-progress'
import { APP_LOCALE } from '@/lib/locale'

export type ExportProgressMode = 'queued' | 'indeterminate' | 'determinate'

export type ExportStagePresentation = {
  headline: string
  detail: string
  mode: ExportProgressMode
  percent: number
  countLabel: string | null
}

/**
 * Worker pipeline_step → kullanıcıya aşama etiketi. Bilinmeyen adım jargonsuz kalır.
 *
 * 🔴 BU SÖZLÜK ŞU AN HİÇ EŞLEŞMİYOR — ÖLÇÜLDÜ (2026-09-21):
 *   SELECT pipeline_step, count(*) FROM export_jobs GROUP BY 1;
 *   → NULL, 3 satır. Worker'daki `tracked_step` yardımcısı tanımlı ama
 *   hiçbir yerden çağrılmıyor, `pipeline_events` tablosu da yok.
 *   Yani başlık her zaman aşağıdaki genel yedeğe düşüyor.
 *   Sözlük SİLİNMEDİ: worker adım takibini bağladığı gün çalışmaya başlar.
 *   Ama bu yüzden ekranın "canlı" hissi buna DEĞİL, `export-stage-ticker.ts`
 *   içindeki gerçek alanlardan türeyen dönen satırlara dayanıyor.
 */
const STEP_HEADLINES: Record<string, string> = {
  queued: 'Queued',
  parsing: 'Reading listening records',
  inserting_tracks: 'Matching songs',
  matching_events: 'Writing records',
  isrc_backfill: 'Filling in the gaps',
  genre_enrichment: 'Final touches',
  enrichment_done: 'Wrapping up',
  completed: 'Wrapping up',
}

function formatCount(processed: number, total: number): string {
  return `${processed.toLocaleString(APP_LOCALE)} / ${total.toLocaleString(APP_LOCALE)} records`
}

/**
 * Export işleme ekranı için dürüst aşama metni.
 * Sahte yüzde yok: total_events yokken indeterminate; varsa gerçek oran.
 */
export function exportStagePresentation(job: ExportJobState | null): ExportStagePresentation {
  if (!job) {
    return {
      headline: 'Getting ready…',
      detail: 'Checking your upload.',
      mode: 'indeterminate',
      percent: 0,
      countLabel: null,
    }
  }

  if (job.status === 'queued') {
    return {
      headline: 'Queued',
      /*
       * 🔴 "processing will start shortly" DEĞİL — ölçülmüş bir yalandı.
       * 122.996 olaylı ZIP 10:54'te kuyruğa girdi, worker 11:40'ta aldı:
       * 46 dakika. İşleme ise 31 saniye sürdü. Yani bekleyişin neredeyse
       * tamamı worker'ın kalkmasını beklemek ve "shortly" o 46 dakika
       * boyunca ekranda duruyordu.
       * Sebebi de gizlemek gerekmiyor: Rosso 7/24 sunucu çalıştırmıyor
       * (CLAUDE.md §1, sıfır maliyet), worker talep üzerine kalkıyor.
       * Kullanıcı bunu bilirse bekleyiş arıza değil tasarım olarak okunur.
       */
      detail: 'Rosso has no always-on server, so a worker boots for your file. You can close this page.',
      mode: 'queued',
      percent: 0,
      countLabel: null,
    }
  }

  const stepKey = job.pipeline_step?.trim().toLowerCase() ?? ''
  const headline =
    (stepKey && STEP_HEADLINES[stepKey]) ||
    (job.total_events && job.total_events > 0 ? 'Matching' : 'Your data is being analyzed')

  const detail =
    'This can take a while — you will see it here when it is done. You can leave this page.'

  if (job.total_events && job.total_events > 0) {
    const processed = job.processed_events ?? 0
    return {
      headline,
      detail,
      mode: 'determinate',
      percent: progressPercent(job),
      countLabel: formatCount(processed, job.total_events),
    }
  }

  return {
    headline,
    detail,
    mode: 'indeterminate',
    percent: 0,
    countLabel: null,
  }
}
