import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LockedPreview } from './locked-preview'

describe('LockedPreview', () => {
  it('kilitliyken başlık, şiirsel açıklama ve CTA butonunu gösterir', () => {
    render(
      <LockedPreview
        title="Müzikal Yolculuğunun Kapısını Aç"
        description="Rosso’nun senin yıllar içindeki rotanı hatırlayabilmesi için bu veriye ihtiyacı var."
        badgeLabel="Katman 2 · Dinleme Geçmişi ZIP’i Gerekir"
        ctaText="Geçmişini Yükle"
        href="/data"
      >
        <div data-testid="backdrop-content">Gizli İçerik</div>
      </LockedPreview>
    )

    expect(screen.getByText('Müzikal Yolculuğunun Kapısını Aç')).toBeInTheDocument()
    expect(
      screen.getByText('Rosso’nun senin yıllar içindeki rotanı hatırlayabilmesi için bu veriye ihtiyacı var.')
    ).toBeInTheDocument()
    expect(screen.getByText('Katman 2 · Dinleme Geçmişi ZIP’i Gerekir')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Geçmişini Yükle/i })
    expect(link).toHaveAttribute('href', '/data')

    // Arka plan elemanı aria-hidden olmalıdır
    const backdrop = screen.getByTestId('backdrop-content').parentElement
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  })

  it('isLocked=false olduğunda overlay olmadan sadece children render edilir', () => {
    render(
      <LockedPreview isLocked={false} title="Kilit Başlığı">
        <div data-testid="open-content">Açık ve Erişilebilir İçerik</div>
      </LockedPreview>
    )

    expect(screen.getByTestId('open-content')).toBeInTheDocument()
    expect(screen.queryByText('Kilit Başlığı')).not.toBeInTheDocument()
  })

  it('fullscreen varyantı uygulandığında doğru sınıfı taşır', () => {
    const { container } = render(
      <LockedPreview variant="fullscreen" title="Tam Ekran Önizleme">
        <div>İçerik</div>
      </LockedPreview>
    )

    expect(container.firstChild).toHaveClass(/variantFullscreen/)
  })
})
