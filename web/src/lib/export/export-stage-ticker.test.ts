import { describe, it, expect } from 'vitest'
import { tickerSatirlari, TICKER_ARALIK_MS } from './export-stage-ticker'
import type { ExportJobState } from './use-export-progress'

// ---------------------------------------------------------------------------
// İşleme ekranındaki dönen durum satırları. Buradaki her test bir DÜRÜSTLÜK
// sözleşmesi, stil değil:
//
//   1. Satır yoksa hiç gösterilmez — boş bir damga dönmesindense hiçbir şey.
//   2. Bitmiş/başarısız işte dönen satır YOK: o ekranların kendi anlatısı var,
//      üstüne "processing…" yazmak açık bir yalan olurdu.
//   3. Sayı içeren satır, sayı GERÇEKTEN varsa çıkar. `total_events` yoksa
//      "0 of 0 plays" yazmak uydurmadır.
//   4. Kuyruk uzadıkça metin DEĞİŞİR. Ölçüldü: 122.996 olaylı ZIP 46 dakika
//      kuyrukta bekledi. Aynı "shortly" cümlesini 46 dakika tekrarlamak
//      kullanıcıya yanlış beklenti kurar.
//   5. Yan-veri ZIP'lerinde birim "plays" değil "records" — beğeni/playlist
//      olayı bir "çalma" değildir.
// ---------------------------------------------------------------------------

function is(over: Partial<ExportJobState> = {}): ExportJobState {
  return {
    id: 'job-1',
    status: 'processing',
    genre_pending: false,
    export_type: 'streaming_history',
    total_events: null,
    processed_events: null,
    matched_events: null,
    skipped_events: null,
    error_count: null,
    error_message: null,
    file_name: 'my_spotify_data.zip',
    file_size: 1024,
    completed_at: null,
    created_at: new Date().toISOString(),
    period_start: null,
    period_end: null,
    pipeline_step: null,
    ...over,
  } as ExportJobState
}

describe('tickerSatirlari', () => {
  it('iş yoksa satır yok', () => {
    expect(tickerSatirlari(null)).toEqual([])
  })

  it('tamamlanmış ve başarısız işte dönen satır YOK', () => {
    expect(tickerSatirlari(is({ status: 'completed' }))).toEqual([])
    expect(tickerSatirlari(is({ status: 'failed' }))).toEqual([])
  })

  it('kuyrukta: "shortly" demez, worker’ın kalkmasını açıkça söyler', () => {
    const s = tickerSatirlari(is({ status: 'queued' }), 0)
    expect(s.length).toBeGreaterThan(0)
    const hepsi = s.map((x) => x.aciklama).join(' ')
    expect(hepsi).not.toMatch(/shortly/i)
    expect(hepsi).toMatch(/worker/i)
  })

  it('kuyruk uzadıkça satır SAYISI artar — metin donmaz', () => {
    const kisa = tickerSatirlari(is({ status: 'queued' }), 10)
    const orta = tickerSatirlari(is({ status: 'queued' }), 150)
    const uzun = tickerSatirlari(is({ status: 'queued' }), 700)
    expect(orta.length).toBeGreaterThan(kisa.length)
    expect(uzun.length).toBeGreaterThan(orta.length)
    // 10 dakikadan sonra "hiçbir şey takılmadı" güvencesi verilir.
    expect(uzun.map((x) => x.etiket)).toContain('nothing is stuck')
  })

  it('sayı yoksa sayı İÇEREN satır üretilmez', () => {
    const s = tickerSatirlari(is({ total_events: null, processed_events: null }))
    const hepsi = s.map((x) => x.aciklama).join(' ')
    expect(hepsi).not.toMatch(/\d/)
  })

  it('sayı varsa gerçek sayı yazılır', () => {
    const s = tickerSatirlari(is({ total_events: 122996, processed_events: 12480 }))
    const hepsi = s.map((x) => x.aciklama).join(' ')
    expect(hepsi).toContain('122,996')
    expect(hepsi).toContain('12,480')
  })

  it('yan-veri ZIP’inde birim "records", eşleştirme satırı yok', () => {
    const s = tickerSatirlari(is({ export_type: 'account_data', total_events: 8316 }))
    const hepsi = s.map((x) => x.aciklama).join(' ')
    expect(hepsi).toContain('records')
    expect(hepsi).not.toContain('plays')
    // Hesap verisi şarkıya eşleştirilmez — o satır çıkmamalı.
    expect(s.map((x) => x.etiket)).not.toContain('matching')
  })

  it('dinleme geçmişinde eşleştirme satırı VAR', () => {
    const s = tickerSatirlari(is({ export_type: 'streaming_history', total_events: 100 }))
    expect(s.map((x) => x.etiket)).toContain('matching')
  })

  it('tekrar eden veriyi atladığımız her zaman söylenir — zip üstüne zip senaryosu', () => {
    const s = tickerSatirlari(is({ total_events: 5000 }))
    expect(s.map((x) => x.etiket)).toContain('deduplicating')
  })

  it('genre_pending açıksa enrichment satırı eklenir, kapalıysa eklenmez', () => {
    const acik = tickerSatirlari(is({ genre_pending: true }))
    const kapali = tickerSatirlari(is({ genre_pending: false }))
    expect(acik.map((x) => x.etiket)).toContain('enrichment queued')
    expect(kapali.map((x) => x.etiket)).not.toContain('enrichment queued')
  })

  it('her satırın etiketi ve açıklaması dolu', () => {
    for (const durum of ['queued', 'processing'] as const) {
      for (const x of tickerSatirlari(is({ status: durum, total_events: 10 }), 999)) {
        expect(x.etiket.trim().length).toBeGreaterThan(0)
        expect(x.aciklama.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('dönüş aralığı okunabilir bir bantta (1.5–4 sn)', () => {
    // Çok kısa: okunmaz ve dikkat çalar. Çok uzun: ekran yine donuk görünür.
    expect(TICKER_ARALIK_MS).toBeGreaterThanOrEqual(1500)
    expect(TICKER_ARALIK_MS).toBeLessThanOrEqual(4000)
  })
})
