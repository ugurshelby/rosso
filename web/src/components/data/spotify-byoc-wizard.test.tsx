import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { I18nProvider } from '@/lib/i18n/provider'
import { data } from '@/lib/i18n/messages/en/data'
import {
  SpotifyByocWizard,
  SPOTIFY_REDIRECT_URI,
} from './spotify-byoc-wizard'

/**
 * `data` yüzeyi henüz merkezi kayıtta değil (Catalog'a eklenmedi) — testler
 * bileşenin `useT()` ihtiyacını kendi `I18nProvider`'ıyla karşılar. Merkezi
 * kayıttan sonra bu saramayı kaldırmaya gerek yok, `I18nServerProvider` zaten
 * aynı mekanizmayı kullanıyor.
 */
function renderWithI18n(ui: ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `data` henüz Catalog'a kayıtlı değil
  return render(<I18nProvider locale="en" messages={{ data } as any}>{ui}</I18nProvider>)
}

describe('SpotifyByocWizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('bağlı değilken Adım 1 ve Adım 2 panellerini render eder', () => {
    renderWithI18n(
      <SpotifyByocWizard
        initialStatus={{
          configured: false,
          verified: false,
          clientId: null,
          verifiedAt: null,
        }}
        isSpotifyConnected={false}
      />,
    )

    expect(screen.getByText('1. Create an app on Spotify')).toBeInTheDocument()
    expect(screen.getByText('2. Paste your credentials')).toBeInTheDocument()
    expect(screen.getAllByText(SPOTIFY_REDIRECT_URI).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Verify and connect Spotify/i })).toBeInTheDocument()
  })

  it('bağlı ve doğrulanmış durumdayken kilitli bağlı kartını gösterir', () => {
    renderWithI18n(
      <SpotifyByocWizard
        initialStatus={{
          configured: true,
          verified: true,
          clientId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          verifiedAt: '2026-09-23T12:00:00Z',
        }}
        isSpotifyConnected={true}
      />,
    )

    expect(screen.getByText('Your own Spotify developer app is connected')).toBeInTheDocument()
    expect(screen.getByText('Unlimited personal quota')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument()
    // Yapıştırma formu kilitli ve gizli olmalı
    expect(screen.queryByText('2. Paste your credentials')).not.toBeInTheDocument()
  })

  it('redirect URI hatası geldiğinde uyarı banner’ını görüntüler', () => {
    renderWithI18n(
      <SpotifyByocWizard
        initialStatus={{
          configured: true,
          verified: true,
          clientId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          verifiedAt: '2026-09-23T12:00:00Z',
        }}
        isSpotifyConnected={false}
        errorCode="spotify_byoc_redirect_uri"
      />,
    )

    expect(
      screen.getByText(/Spotify rejected the connection \(Redirect URI mismatch\)/i),
    ).toBeInTheDocument()
    // Redirect URI hatası varken bağlı ekranına geçilmez, form alanı açık tutulur
    expect(screen.getByText('2. Paste your credentials')).toBeInTheDocument()
  })

  it('geçersiz hex formatında Client ID girildiğinde hata gösterir', async () => {
    const user = userEvent.setup()
    renderWithI18n(
      <SpotifyByocWizard
        initialStatus={{
          configured: false,
          verified: false,
          clientId: null,
          verifiedAt: null,
        }}
        isSpotifyConnected={false}
      />,
    )

    const clientIdInput = screen.getByLabelText('Client ID')
    const secretInput = screen.getByLabelText('Client Secret')

    await user.type(clientIdInput, 'gecersiz-id')
    await user.type(secretInput, 'gecersiz-secret')

    const submitBtn = screen.getByRole('button', { name: /Verify and connect Spotify/i })
    await user.click(submitBtn)

    expect(
      await screen.findByText(/Spotify credentials must be 32-character hex strings/i),
    ).toBeInTheDocument()
  })

  it('başarılı doğrulamada API çağrısı yapar ve yönlendirme durumuna geçer', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    global.fetch = fetchMock

    renderWithI18n(
      <SpotifyByocWizard
        initialStatus={{
          configured: false,
          verified: false,
          clientId: null,
          verifiedAt: null,
        }}
        isSpotifyConnected={false}
      />,
    )

    const validHex32_1 = '0123456789abcdef0123456789abcdef'
    const validHex32_2 = 'abcdef0123456789abcdef0123456789'

    await user.type(screen.getByLabelText('Client ID'), validHex32_1)
    await user.type(screen.getByLabelText('Client Secret'), validHex32_2)

    await user.click(screen.getByRole('button', { name: /Verify and connect Spotify/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/spotify/byoc',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: validHex32_1,
            clientSecret: validHex32_2,
          }),
        }),
      )
    })

    expect(
      await screen.findByText(/Credentials verified! Starting Spotify authorization/i),
    ).toBeInTheDocument()
  })
})
