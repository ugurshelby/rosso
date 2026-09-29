import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nProvider } from '@/lib/i18n/provider'
import { data } from '@/lib/i18n/messages/en/data'
import { SpotifyZipGuide, SPOTIFY_PRIVACY_URL } from './spotify-zip-guide'

/**
 * `data` yüzeyi henüz merkezi kayıtta değil (Catalog'a eklenmedi) — test kendi
 * `I18nProvider`'ıyla sarar. Bkz. `spotify-byoc-wizard.test.tsx` aynı yorum.
 */
function renderWithI18n(ui: ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `data` henüz Catalog'a kayıtlı değil
  return render(<I18nProvider locale="en" messages={{ data } as any}>{ui}</I18nProvider>)
}

describe('SpotifyZipGuide', () => {
  it('Spotify hesap gizliliği mockup başlığını ve linkini render eder', () => {
    renderWithI18n(<SpotifyZipGuide />)

    expect(screen.getByText('Spotify Account Privacy')).toBeInTheDocument()
    expect(screen.getByText('Download your full listening history')).toBeInTheDocument()

    const links = screen.getAllByRole('link', { name: /Spotify privacy/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', SPOTIFY_PRIVACY_URL)
    expect(links[0]).toHaveAttribute('target', '_blank')
  })

  it('Rosso için gerekli olan "Extended streaming history" paketini vurgulu render eder', () => {
    renderWithI18n(<SpotifyZipGuide />)

    expect(screen.getByText('Extended streaming history')).toBeInTheDocument()
    expect(screen.getByText('★ Required')).toBeInTheDocument()
    expect(screen.getAllByText('Recommended')).toHaveLength(2)
    expect(screen.getByText('Account data')).toBeInTheDocument()
    expect(screen.getByText('Technical log data')).toBeInTheDocument()
  })

  it('dürüst süre ve API takip beklentilerini içeren 4 kartlık kılavuzu gösterir', () => {
    renderWithI18n(<SpotifyZipGuide />)

    expect(screen.getByText('Prep time')).toBeInTheDocument()
    expect(screen.getByText('No API tracking')).toBeInTheDocument()
    expect(screen.getByText('Email notification')).toBeInTheDocument()
    expect(screen.getByText('Uploading to Rosso')).toBeInTheDocument()
  })
})
