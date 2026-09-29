import type { ExportJobState } from '@/lib/export/use-export-progress'

/**
 * İşleme ekranındaki DÖNEN durum satırları.
 *
 * Sahip (2026-09-21): *"kullanıcı zip yüklenir ve işlenirken sıkılmaması için
 * zip yükleme ekranında tıpkı claude code'un yaptığı gibi: processing...
 * enrichment... tipi ufak ara ara değişen durum bildirimleri oynamalı."*
 *
 * 🔴 SATIRLARIN HEPSİ DOĞRU OLMAK ZORUNDA. Rosso'nun kuralı zaten yazılıydı
 * (`export-stage-presentation.ts`: *"Sahte yüzde yok"*). Dönen bir metin bu
 * kuralı esnetmek için bahane değil: burada dönen şey UYDURULMUŞ AŞAMALAR
 * değil, o anda gerçekten olan işin farklı yüzleri.
 *
 * ⚠ NEDEN `pipeline_step` KULLANILMIYOR — ÖLÇÜLDÜ (2026-09-21):
 *   SELECT pipeline_step, count(*) FROM export_jobs GROUP BY 1;
 *   → pipeline_step = NULL, 3 satır. Yani TÜM işlerde boş.
 *   `export-stage-presentation.ts`'teki `STEP_HEADLINES` sözlüğü (parsing,
 *   inserting_tracks, isrc_backfill, genre_enrichment…) hiç eşleşmiyor ve
 *   başlık her zaman genel yedeğe düşüyor. Worker'da `tracked_step` yardımcısı
 *   TANIMLI ama hiçbir yerden ÇAĞRILMIYOR; `pipeline_events` tablosu da yok.
 *   İşleme ekranının statik kalmasının asıl sebebi buydu: elindeki tek
 *   "aşama" sinyali ölüydü.
 *   Bu yüzden satırlar GERÇEKTEN dolu olan alanlardan türetiliyor:
 *   `status`, `total_events`/`processed_events`, `matched_events`,
 *   `export_type`, `genre_pending`.
 *
 * ⚠ KUYRUK SÜRESİ UZUN OLABİLİR — ÖLÇÜLDÜ: 122.996 olaylı ZIP
 *   10:54'te oluşturuldu, worker onu 11:40'ta aldı (**46 dakika kuyruk**),
 *   işleme ise yalnız 31 saniye sürdü. Yani bekleyişin neredeyse tamamı
 *   "worker uyanıyor" safhası — Rosso sıfır maliyet mimarisinde worker
 *   GitHub Actions ile talep üzerine kalkıyor (CLAUDE.md §1). Eski metin
 *   bu 46 dakika boyunca "processing will start shortly" diyordu; bu yanlış
 *   beklenti yaratıyordu. Kuyruk satırları artık bunu açıkça söylüyor.
 */

export interface TickerSatiri {
  /** Kısa durum — Claude Code'daki `processing…` gibi tek kelimelik damga. */
  etiket: string
  /** Bir cümlelik doğru açıklama. */
  aciklama: string
}

/** Satır değişim aralığı (ms). 2.600 = okunacak kadar uzun, sıkmayacak kadar kısa. */
export const TICKER_ARALIK_MS = 2_600

function sayiBicimle(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Kuyrukta beklerken gösterilecek satırlar.
 * Süre uzadıkça metin DEĞİŞİR: 2 dakikadan sonra kullanıcıya bunun normal
 * olduğunu ve sayfayı kapatabileceğini söylemek, aynı "shortly" cümlesini
 * 46 dakika tekrarlamaktan dürüst.
 */
function kuyrukSatirlari(bekleyenSaniye: number): TickerSatiri[] {
  const temel: TickerSatiri[] = [
    {
      etiket: 'queued',
      aciklama: 'Your file is stored. Waiting for a processing worker to pick it up.',
    },
    {
      etiket: 'waking worker',
      aciklama: 'Rosso runs no always-on server — a worker boots on demand for your upload.',
    },
  ]

  if (bekleyenSaniye >= 120) {
    temel.push({
      etiket: 'still queued',
      aciklama: 'This step can take a while. You can close this page — processing continues.',
    })
  }

  if (bekleyenSaniye >= 600) {
    temel.push({
      etiket: 'nothing is stuck',
      aciklama: 'Long queues are normal here. You will see the result on this page when it lands.',
    })
  }

  return temel
}

/**
 * İşlenirken gösterilecek satırlar — hepsi işin o anki gerçek yüzü.
 */
function islemeSatirlari(job: ExportJobState): TickerSatiri[] {
  const satirlar: TickerSatiri[] = []
  const toplam = job.total_events ?? 0
  const islenen = job.processed_events ?? 0
  const eslesen = job.matched_events ?? 0
  const kayitMi = job.export_type === 'account_data' || job.export_type === 'technical_log'
  const birim = kayitMi ? 'records' : 'plays'

  satirlar.push({
    etiket: 'reading',
    aciklama: toplam > 0
      ? `Reading ${sayiBicimle(toplam)} ${birim} out of the archive.`
      : `Reading the ${birim} out of the archive.`,
  })

  if (toplam > 0 && islenen > 0) {
    satirlar.push({
      etiket: 'processing',
      aciklama: `${sayiBicimle(islenen)} of ${sayiBicimle(toplam)} ${birim} written so far.`,
    })
  }

  if (!kayitMi) {
    satirlar.push({
      etiket: 'matching',
      aciklama: eslesen > 0
        ? `${sayiBicimle(eslesen)} ${birim} matched to songs in the catalog.`
        : 'Matching each play to a song in the catalog.',
    })
  }

  satirlar.push({
    etiket: 'deduplicating',
    aciklama: 'Plays you already uploaded are skipped — nothing is counted twice.',
  })

  if (job.genre_pending) {
    satirlar.push({
      etiket: 'enrichment queued',
      aciklama: 'Genres and audio character are filled in afterwards, in the background.',
    })
  }

  return satirlar
}

/**
 * İş durumuna göre dönecek satır listesi. Boş dizi = dönen satır gösterilmez.
 *
 * @param bekleyenSaniye `created_at`'ten bu yana geçen süre (kuyruk metinleri için).
 */
export function tickerSatirlari(
  job: ExportJobState | null,
  bekleyenSaniye = 0,
): TickerSatiri[] {
  if (!job) return []
  if (job.status === 'queued') return kuyrukSatirlari(bekleyenSaniye)
  if (job.status === 'processing') return islemeSatirlari(job)
  // completed / failed: dönen satır yok — o ekranların kendi anlatısı var.
  return []
}
