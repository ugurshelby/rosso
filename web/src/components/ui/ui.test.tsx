import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'
import { Input } from './input'
import { Card, StatCard } from './card'
import { Badge, PlatformBadge } from './badge'
import { Toggle } from './toggle'
import { Skeleton } from './skeleton'

describe('Button', () => {
  it('tıklanınca onClick çağrılır', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled iken tıklanamaz', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button disabled onClick={onClick}>Sil</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('varsayılan type=button (form submit etmez)', () => {
    render(<Button>Aç</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Input', () => {
  it('invalid iken aria-invalid taşır', () => {
    render(<Input invalid aria-label="email" />)
    expect(screen.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Card', () => {
  it('içeriği render eder', () => {
    render(<Card>içerik</Card>)
    expect(screen.getByText('içerik')).toBeInTheDocument()
  })

  it('StatCard değer ve label gösterir', () => {
    render(<StatCard value="47.320" label="Dakika" />)
    expect(screen.getByText('47.320')).toBeInTheDocument()
    expect(screen.getByText('Dakika')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('genel badge içeriği gösterir', () => {
    render(<Badge tone="success">Connected</Badge>)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('PlatformBadge platform adını gösterir', () => {
    render(<PlatformBadge platform="spotify" />)
    expect(screen.getByText('Spotify')).toBeInTheDocument()
  })
})

describe('Toggle', () => {
  it('role=switch ve label taşır', () => {
    render(<Toggle label="Senkronize et" />)
    const sw = screen.getByRole('switch', { name: 'Senkronize et' })
    expect(sw).toBeInTheDocument()
  })

  it('tıklayınca onChange çağrılır', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Toggle label="Aç" onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalled()
  })
})

describe('Skeleton', () => {
  it('aria-hidden ile dekoratiftir', () => {
    const { container } = render(<Skeleton width={100} height={20} />)
    expect(container.firstChild).toHaveAttribute('aria-hidden')
  })
})
