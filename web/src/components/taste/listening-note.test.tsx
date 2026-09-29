import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createTranslatorFrom } from '@/lib/i18n/translate'
import { taste as tasteEn } from '@/lib/i18n/messages/en/taste'
import { ListeningNote } from './listening-note'

const { t } = createTranslatorFrom('en', { taste: tasteEn })

// ---------------------------------------------------------------------------
// Dinleme notu bileşeni. İki sözleşme:
//   1. Not yoksa HİÇBİR ŞEY çizilmez (AI kapalıyken sayfada boş kutu kalmaz).
//   2. §9 No-Slop: arayüzde "AI"/"yapay zekâ" etiketi ya da ✨ yok.
// ---------------------------------------------------------------------------

const NOT = {
  not: 'Gündüz yüksek tempoda odaklanırken gece sözsüz dokulara sığınan bir dinleyici.',
  dokular: ['cinematic', 'nocturnal', 'analog-textured'],
  uretildi: '2026-09-19T08:00:00Z',
}

describe('ListeningNote', () => {
  it('not yoksa hiçbir şey çizmez', () => {
    const { container } = render(<ListeningNote note={null} t={t} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('notu ve sonik dokuları çizer', () => {
    render(<ListeningNote note={NOT} t={t} />)
    expect(screen.getByText(NOT.not)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Sonic textures' }).children).toHaveLength(3)
  })

  it('bölüm başlığıyla erişilebilir biçimde etiketlenir', () => {
    render(<ListeningNote note={NOT} t={t} />)
    expect(screen.getByRole('region', { name: 'Listening note' })).toBeInTheDocument()
  })

  it('doku yoksa boş liste çizmez', () => {
    render(<ListeningNote note={{ ...NOT, dokular: [] }} t={t} />)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('§9: AI varlığını fetişleştirmez — "AI", "yapay zeka" ya da ✨ yok', () => {
    const { container } = render(<ListeningNote note={NOT} t={t} />)
    const metin = container.textContent ?? ''
    expect(metin).not.toMatch(/\bAI\b|yapay zek|✨/i)
  })
})
