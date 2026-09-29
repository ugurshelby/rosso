import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n/provider'
import { journey } from '@/lib/i18n/messages/en/journey'

vi.mock('@/lib/hooks/use-prefers-reduced-motion', () => ({ usePrefersReducedMotion: () => true }))

import { JourneyFinale } from './journey-finale'

/** Test yardımcısı: bileşen `useT()` gerektirir — İngilizce sözlükle sarmalanır. */
function renderWithI18n(ui: ReactNode) {
  return render(
    <I18nProvider locale="en" messages={{ journey } as never}>
      {ui}
    </I18nProvider>,
  )
}

// ---------------------------------------------------------------------------
// Journey kapanış sahnesi. Sözleşmeler:
//   1. AI metni yoksa eski iki satırlık kapanış aynen çizilir (AI vazgeçilmez değil).
//   2. AI metni varsa her paragraf ve son cümle çizilir; eski satır çıkmaz.
//   3. Yıl aralığı yalnız iki farklı yıl varsa gösterilir.
//   4. "Back to start" tetikleyicisi çalışır.
// ---------------------------------------------------------------------------

const METIN = {
  tr: {
    paragraphs: ["Her şey 2017'de başladı.", 'Sonra hip-hop geldi.', 'Bazı şarkılar hep kaldı.'],
    last_line: 'Artık müzik sabah dokuzda başlıyor.',
  },
}

describe('JourneyFinale', () => {
  it('kapanış metni yoksa eski iki satırı çizer', () => {
    renderWithI18n(<JourneyFinale onRestart={() => {}} />)
    expect(screen.getByText(/Every listen is a new line/)).toBeInTheDocument()
    expect(screen.getByText('Yolculuk devam ediyor')).toBeInTheDocument()
  })

  it('AI metnini paragraf paragraf ve son cümleyle çizer; eski satırı çizmez', () => {
    renderWithI18n(<JourneyFinale closing={METIN} startYear={2017} endYear={2026} onRestart={() => {}} />)
    for (const p of METIN.tr.paragraphs) expect(screen.getByText(p)).toBeInTheDocument()
    expect(screen.getByText(METIN.tr.last_line)).toBeInTheDocument()
    expect(screen.queryByText(/Every listen is a new line/)).not.toBeInTheDocument()
  })

  it('tek yıllık aralıkta yıl satırını göstermez', () => {
    const { rerender } = renderWithI18n(<JourneyFinale closing={METIN} startYear={2026} endYear={2026} onRestart={() => {}} />)
    expect(screen.queryByLabelText(/ile .* arası/)).not.toBeInTheDocument()
    rerender(
      <I18nProvider locale="en" messages={{ journey } as never}>
        <JourneyFinale closing={METIN} startYear={2017} endYear={2026} onRestart={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getByLabelText('2017 ile 2026 arası')).toBeInTheDocument()
  })

  it('reduced-motion’da metin doğrudan görünür durumdadır', () => {
    const { container } = renderWithI18n(<JourneyFinale closing={METIN} onRestart={() => {}} />)
    expect(container.querySelector('[data-visible="true"]')).not.toBeNull()
  })

  it('"Back to start" geri çağrıyı tetikler', () => {
    const onRestart = vi.fn()
    renderWithI18n(<JourneyFinale closing={METIN} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the start' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
