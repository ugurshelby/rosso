import { describe, it, expect } from 'vitest'
import { updatePasswordErrorMessage } from './update-password-form'

describe('updatePasswordErrorMessage', () => {
  it('aynı şifre → "farklı olmalı" (bağlantı süresi DEĞİL)', () => {
    const m = updatePasswordErrorMessage({ code: 'same_password', message: 'New password should be different from the old password.', status: 422 })
    expect(m).toMatch(/different from your current/)
    expect(m).not.toMatch(/expired/)
  })
  it('zayıf şifre', () => {
    expect(updatePasswordErrorMessage({ code: 'weak_password' })).toMatch(/too weak/)
  })
  it('oturum yoksa bağlantı süresi/tarayıcı uyarısı', () => {
    expect(updatePasswordErrorMessage({ message: 'Auth session missing!', status: 400 })).toMatch(/expired|another browser/)
  })
  it('bilinmeyen hata genel mesaj', () => {
    expect(updatePasswordErrorMessage({})).toMatch(/couldn’t be updated/)
  })
})
