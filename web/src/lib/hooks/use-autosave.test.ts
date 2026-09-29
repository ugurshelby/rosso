// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from './use-autosave'

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('debounce sonrası kaydeder ve saved durumuna geçer', async () => {
    const save = vi.fn(async () => ({ ok: true as const }))
    let value = 'a'

    const { result } = renderHook(() =>
      useAutosave({
        debounceMs: 1000,
        getPayload: () => value,
        save,
      }),
    )

    act(() => {
      value = 'b'
      result.current.scheduleSave()
    })

    expect(result.current.status).toBe('dirty')
    expect(save).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saved')
  })

  it('HTTP başarısı olmadan saved göstermez', async () => {
    const save = vi.fn(async () => ({ ok: false as const, error: 'Patladı' }))
    let value = 'a'

    const { result } = renderHook(() =>
      useAutosave({
        debounceMs: 200,
        getPayload: () => value,
        save,
      }),
    )

    act(() => {
      value = 'b'
      result.current.scheduleSave()
    })

    await act(async () => {
      vi.advanceTimersByTime(200)
      await Promise.resolve()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Patladı')
  })

  it('flush anında kaydeder', async () => {
    const save = vi.fn(async () => ({ ok: true as const }))
    let value = 'x'

    const { result } = renderHook(() =>
      useAutosave({
        getPayload: () => value,
        save,
      }),
    )

    act(() => {
      value = 'y'
      result.current.scheduleSave()
    })

    await act(async () => {
      await result.current.flush()
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saved')
  })

  it('offline iken kuyruğa yazar', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    const save = vi.fn(async () => ({ ok: true as const }))
    let value = 'offline-test'

    const { result } = renderHook(() =>
      useAutosave({
        getPayload: () => value,
        save,
        queueKey: 'rosso:test-queue',
      }),
    )

    act(() => {
      value = 'offline-changed'
    })

    await act(async () => {
      await result.current.flush()
    })

    expect(save).not.toHaveBeenCalled()
    expect(result.current.status).toBe('offline')
    expect(localStorage.getItem('rosso:test-queue')).toContain('offline-changed')

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })
})
