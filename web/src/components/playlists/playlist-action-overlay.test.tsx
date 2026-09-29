import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n/provider'
import { playlists as playlistsEn } from '@/lib/i18n/messages/en/playlists'

import { PlaylistActionOverlay } from './playlist-action-overlay'

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      {ui}
    </I18nProvider>,
  )
}

// ---------------------------------------------------------------------------
// Spotify'a ekleme geri bildirimi. 2026-09-21'de `'loading'` durumu eklendi
// (Sahip: "spotifya eklenene kadar bir loading animasyonu, sonra eklendi
// onay animasyonu"). Kilitlenen sözleşmeler:
//
//   1. `null` → HİÇBİR ŞEY çizilmez. Overlay tam ekran ve `pointer-events`
//      kapalı olsa da, kalıcı bir katman bırakmak arkadaki sayfayı bulanık
//      gösterirdi.
//   2. Üç durumun her biri KENDİ metnini gösterir ve ötekini göstermez —
//      "Added to Spotify" yazarken hâlâ yükleniyor olmak en kötü yanlış.
//   3. `aria-live="polite"` + `role="status"`: durum değişimi ekran
//      okuyucuya ulaşır. Animasyon görmeyen kullanıcı da ne olduğunu bilir.
//   4. Yükleme spinner'ı `aria-hidden`: dekoratif, metni o söylüyor.
// ---------------------------------------------------------------------------

const ETIKETLER = {
  loadingLabel: 'Adding to Spotify…',
  successLabel: 'Added to Spotify',
  errorLabel: 'Couldn’t add to Spotify',
}

describe('PlaylistActionOverlay', () => {
  it('state=null iken hiçbir şey çizmez', () => {
    const { container } = renderWithI18n(<PlaylistActionOverlay state={null} {...ETIKETLER} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('yükleniyor: yalnız yükleme metni, onay metni YOK', () => {
    renderWithI18n(<PlaylistActionOverlay state="loading" {...ETIKETLER} />)
    expect(screen.getByText('Adding to Spotify…')).toBeTruthy()
    expect(screen.queryByText('Added to Spotify')).toBeNull()
    expect(screen.queryByText('Couldn’t add to Spotify')).toBeNull()
  })

  it('başarı: yalnız onay metni, yükleme metni YOK', () => {
    renderWithI18n(<PlaylistActionOverlay state="success" {...ETIKETLER} />)
    expect(screen.getByText('Added to Spotify')).toBeTruthy()
    expect(screen.queryByText('Adding to Spotify…')).toBeNull()
  })

  it('hata: yalnız hata metni', () => {
    renderWithI18n(<PlaylistActionOverlay state="error" {...ETIKETLER} />)
    expect(screen.getByText('Couldn’t add to Spotify')).toBeTruthy()
    expect(screen.queryByText('Added to Spotify')).toBeNull()
  })

  it('durum değişimi ekran okuyucuya bildirilir (role=status, aria-live)', () => {
    renderWithI18n(<PlaylistActionOverlay state="loading" {...ETIKETLER} />)
    const durum = screen.getByRole('status')
    expect(durum.getAttribute('aria-live')).toBe('polite')
  })

  it('özel yükleme metni geçilebilir — yıllık export mood’dan farklı konuşur', () => {
    renderWithI18n(
      <PlaylistActionOverlay
        state="loading"
        {...ETIKETLER}
        loadingLabel="Building your 2025…"
      />,
    )
    expect(screen.getByText('Building your 2025…')).toBeTruthy()
    expect(screen.queryByText('Adding to Spotify…')).toBeNull()
  })
})
