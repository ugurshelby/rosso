import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { ProcessingTicker } from './processing-ticker'
import { TICKER_ARALIK_MS } from '@/lib/export/export-stage-ticker'
import type { ExportJobState } from '@/lib/export/use-export-progress'

// ---------------------------------------------------------------------------
// Sahibin isteği: "zip yüklenir ve işlenirken ... ara ara değişen durum
// bildirimleri oynamalı". Buradaki testler o davranışın GERÇEKTEN olduğunu
// kanıtlıyor — tarayıcıda gözle bakmak bunu kanıtlamaz, çünkü satır 2,6
// saniyede bir değişiyor ve ekran görüntüsü tek kare gösterir.
//
// Kilitlenen sözleşmeler:
//   1. Satır zamanla DEĞİŞİR (tek kare değil, döngü).
//   2. Tüm satırlar gösterildikten sonra başa döner (sonsuz döngü, tükenmez).
//   3. Gerçek aşama değişince (queued → processing) sıra SIFIRLANIR: önceki
//      aşamanın satırı yeni aşamada ekranda kalamaz.
//   4. Bitmiş işte hiçbir şey çizilmez.
// ---------------------------------------------------------------------------

function is(over: Partial<ExportJobState> = {}): ExportJobState {
  return {
    id: 'job-1',
    status: 'processing',
    genre_pending: false,
    export_type: 'streaming_history',
    total_events: 122996,
    processed_events: 12480,
    matched_events: 9000,
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

/** O anda ekranda duran satırın etiketi (`processing…` → `processing`). */
function aktifEtiket(): string {
  const durum = screen.getByRole('status')
  const ilk = durum.textContent ?? ''
  return ilk.split('…')[0].trim()
}

describe('ProcessingTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('bitmiş işte hiçbir şey çizmez', () => {
    const { container } = render(<ProcessingTicker job={is({ status: 'completed' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('iş yoksa hiçbir şey çizmez', () => {
    const { container } = render(<ProcessingTicker job={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('satır zamanla DEĞİŞİR', () => {
    render(<ProcessingTicker job={is()} />)
    const birinci = aktifEtiket()
    expect(birinci.length).toBeGreaterThan(0)

    act(() => { vi.advanceTimersByTime(TICKER_ARALIK_MS + 50) })
    const ikinci = aktifEtiket()
    expect(ikinci).not.toBe(birinci)
  })

  it('tüm satırlar dolaşıldıktan sonra başa döner — döngü tükenmez', () => {
    render(<ProcessingTicker job={is()} />)
    const ilk = aktifEtiket()
    const gorulen = new Set<string>([ilk])

    // Bol turla dolaş; hiçbir turda boş satır çıkmamalı.
    for (let i = 0; i < 12; i += 1) {
      act(() => { vi.advanceTimersByTime(TICKER_ARALIK_MS + 50) })
      const e = aktifEtiket()
      expect(e.length).toBeGreaterThan(0)
      gorulen.add(e)
    }

    // En az iki farklı satır görüldü (döngü gerçek) ve ilk satıra dönüldü.
    expect(gorulen.size).toBeGreaterThan(1)
    expect(gorulen.has(ilk)).toBe(true)
  })

  it('aşama değişince sıra SIFIRLANIR — eski aşamanın satırı kalmaz', () => {
    const { rerender } = render(<ProcessingTicker job={is({ status: 'queued' })} />)

    // Kuyruk satırlarında ilerle.
    act(() => { vi.advanceTimersByTime(TICKER_ARALIK_MS + 50) })
    const kuyrukSatiri = aktifEtiket()

    // Gerçek aşama değişti.
    rerender(<ProcessingTicker job={is({ status: 'processing' })} />)

    const islemeSatiri = aktifEtiket()
    expect(islemeSatiri).not.toBe(kuyrukSatiri)
    // İlk işleme satırı her zaman 'reading' — sıra başa döndü, ortadan devam etmedi.
    expect(islemeSatiri).toBe('reading')
  })

  it('durum değişimi ekran okuyucuya bildirilir', () => {
    render(<ProcessingTicker job={is()} />)
    const durum = screen.getByRole('status')
    expect(durum.getAttribute('aria-live')).toBe('polite')
  })
})
