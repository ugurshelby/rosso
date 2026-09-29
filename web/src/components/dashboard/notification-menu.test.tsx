import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n/provider'
import { dashboard as dashboardEn } from '@/lib/i18n/messages/en/dashboard'
import { NotificationMenu } from './notification-menu'
import type { DashboardAlert } from '@/lib/platform/dashboard-alerts.types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ dashboard: dashboardEn }}>
      {ui}
    </I18nProvider>,
  )
}

describe('NotificationMenu', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('renders trigger button and badge correctly when there are alerts', () => {
    const alerts: DashboardAlert[] = [
      { kind: 'spotify_cooldown', remainingSeconds: 45 },
    ]

    renderWithI18n(<NotificationMenu alerts={alerts} />)

    const trigger = screen.getByRole('button', { name: /notifications, 1 unread/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens desktop popover anchored to trigger button when clicked', () => {
    renderWithI18n(<NotificationMenu alerts={[]} />)

    const trigger = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('dialog', { name: /notifications panel/i })
    expect(panel).toBeInTheDocument()
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })

  it('closes popover when Escape is pressed or clicking outside', () => {
    renderWithI18n(
      <div>
        <div data-testid="outside">Outside area</div>
        <NotificationMenu alerts={[]} />
      </div>,
    )

    const trigger = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Reopen and test outside click
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders in a Portal with backdrop on mobile screens (< 640px)', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 639px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const alerts: DashboardAlert[] = [
      { kind: 'spotify_veri_izni_gerekli' },
    ]

    renderWithI18n(
      <div data-testid="app-container">
        <NotificationMenu alerts={alerts} />
      </div>,
    )

    const trigger = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(trigger)

    const panel = screen.getByRole('dialog', { name: /notifications panel/i })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-modal', 'true')

    // On mobile, panel is portaled to document.body, outside data-testid="app-container"
    expect(screen.getByTestId('app-container')).not.toContainElement(panel)
    expect(document.body).toContainElement(panel)

    // Backdrop should exist and dismiss on click
    const backdrop = document.querySelector('[class*="backdrop"]')
    expect(backdrop).toBeInTheDocument()
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  })

  it('allows dismissing individual alerts and all alerts', () => {
    const alerts: DashboardAlert[] = [
      { kind: 'spotify_cooldown', remainingSeconds: 30 },
      { kind: 'sync_delay', hoursSinceSync: 2 },
    ]

    renderWithI18n(<NotificationMenu alerts={alerts} />)

    const trigger = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(trigger)

    expect(screen.getByText('Spotify Rate Limit')).toBeInTheDocument()
    expect(screen.getByText('Listening Sync Status')).toBeInTheDocument()

    // Dismiss one alert
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss notification/i })
    fireEvent.click(dismissButtons[0])

    expect(screen.queryByText('Spotify Rate Limit')).not.toBeInTheDocument()
    expect(screen.getByText('Listening Sync Status')).toBeInTheDocument()

    // Dismiss all
    const dismissAllBtn = screen.getByRole('button', { name: /dismiss all/i })
    fireEvent.click(dismissAllBtn)

    expect(screen.queryByText('Listening Sync Status')).not.toBeInTheDocument()
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })
})
