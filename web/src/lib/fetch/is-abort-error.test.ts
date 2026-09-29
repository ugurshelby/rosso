import { describe, expect, it } from 'vitest'
import { isAbortError } from './is-abort-error'

describe('isAbortError', () => {
  it('AbortError DOMException tanır', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
  })

  it('AbortError Error tanır', () => {
    const err = new Error('aborted')
    err.name = 'AbortError'
    expect(isAbortError(err)).toBe(true)
  })

  it('diğer hataları reddeder', () => {
    expect(isAbortError(new Error('network'))).toBe(false)
    expect(isAbortError('nope')).toBe(false)
  })
})
