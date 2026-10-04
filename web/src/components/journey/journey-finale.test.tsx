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
//   1. AI metni yoksa sade iki satırlık kapanış çizilir (AI vazgeçilmez değil).
//   2. AI metni SEÇİLİ DİLDE varsa her paragraf ve son cümle çizilir; sade satır çıkmaz.
//      O dilde metin yoksa sade kapanış (yanlış dilde metin gösterilmez).
//   3. Yıl aralığı yalnız iki farklı yıl varsa gösterilir.
//   4. "Back to start" tetikleyicisi çalışır.
// ---------------------------------------------------------------------------

const METIN = {
  tr: {
    paragraphs: ['Dedublüman 2020’de oradaydı.', 'Sonra hip-hop geldi.', 'Bazı şarkılar hep kaldı.'],
    last_line: 'Bugünlerde yine Madrigal çalıyor.',
  },
  en: {
    paragraphs: ['Dedublüman was there in 2020.', 'Then hip-hop arrived.', 'Some songs never left.'],
    last_line: 'These days Madrigal is back on.',
  },
}

describe('JourneyFinale', () => {
  it('kapanış metni yoksa eski iki satırı çizer', () => {
    renderWithI18n(<JourneyFinale onRestart={() => {}} />)
    expect(screen.getByText(/Every listen is a new line/)).toBeInTheDocument()
    expect(screen.getByText('The story goes on')).toBeInTheDocument()
  })

  it('seçili dilde (İngilizce) metin yoksa Türkçe metni göstermez, sade kapanışa düşer', () => {
    renderWithI18n(<JourneyFinale closing={{ tr: METIN.tr }} onRestart={() => {}} />)
    expect(screen.queryByText(METIN.tr.paragraphs[0]!)).not.toBeInTheDocument()
    expect(screen.getByText(/Every listen is a new line/)).toBeInTheDocument()
  })

  it('AI metnini paragraf paragraf ve son cümleyle çizer; eski satırı çizmez', () => {
    renderWithI18n(<JourneyFinale closing={METIN} startYear={2017} endYear={2026} onRestart={() => {}} />)
    for (const p of METIN.en.paragraphs) expect(screen.getByText(p)).toBeInTheDocument()
    expect(screen.getByText(METIN.en.last_line)).toBeInTheDocument()
    expect(screen.queryByText(/Every listen is a new line/)).not.toBeInTheDocument()
  })

  it('tek yıllık aralıkta yıl satırını göstermez', () => {
    const { rerender } = renderWithI18n(<JourneyFinale closing={METIN} startYear={2026} endYear={2026} onRestart={() => {}} />)
    expect(screen.queryByLabelText(/From .* to /)).not.toBeInTheDocument()
    rerender(
      <I18nProvider locale="en" messages={{ journey } as never}>
        <JourneyFinale closing={METIN} startYear={2017} endYear={2026} onRestart={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getByLabelText('From 2017 to 2026')).toBeInTheDocument()
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
