import { describe, expect, it } from 'vitest'
import { validateUpload, MAX_ZIP_BYTES, zipImzasiMi, guvenliDosyaAdi } from './validate-upload'

describe('validateUpload', () => {
  it('geçerli zip kabul eder', () => {
    expect(validateUpload({ name: 'export.zip', type: 'application/zip', size: 1000 })).toEqual({
      ok: true,
    })
  })

  it('.zip olmayan uzantıyı reddeder (400)', () => {
    const r = validateUpload({ name: 'data.json', type: 'application/json', size: 1000 })
    expect(r).toMatchObject({ ok: false, status: 400 })
  })

  it('geçersiz mime reddeder (415)', () => {
    const r = validateUpload({ name: 'x.zip', type: 'image/png', size: 1000 })
    expect(r).toMatchObject({ ok: false, status: 415 })
  })

  it('boş dosya reddeder (400)', () => {
    const r = validateUpload({ name: 'x.zip', type: 'application/zip', size: 0 })
    expect(r).toMatchObject({ ok: false, status: 400 })
  })

  it('200MB üstünü reddeder (413)', () => {
    const r = validateUpload({ name: 'x.zip', type: 'application/zip', size: MAX_ZIP_BYTES + 1 })
    expect(r).toMatchObject({ ok: false, status: 413 })
  })

  it('octet-stream mime kabul eder (tarayıcı varyasyonu)', () => {
    expect(
      validateUpload({ name: 'export.zip', type: 'application/octet-stream', size: 1000 }).ok
    ).toBe(true)
  })
})

describe('zipImzasiMi', () => {
  it('yerel dosya başlığı imzasıyla başlayan dosyayı kabul eder', () => {
    expect(zipImzasiMi(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe(true)
  })
  it('boş arşiv imzasını kabul eder', () => {
    expect(zipImzasiMi(new Uint8Array([0x50, 0x4b, 0x05, 0x06]))).toBe(true)
  })
  it('PNG/metin/boş içeriği reddeder (.zip uzantısı yetmez)', () => {
    expect(zipImzasiMi(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
    expect(zipImzasiMi(new TextEncoder().encode('hello'))).toBe(false)
    expect(zipImzasiMi(new Uint8Array([]))).toBe(false)
  })
})

describe('guvenliDosyaAdi', () => {
  it('yol parçalarını ve tehlikeli karakterleri atar', () => {
    expect(guvenliDosyaAdi('../../etc/passwd.zip')).toBe('passwd.zip')
    expect(guvenliDosyaAdi(String.raw`C:\Users\x\a<b>.zip`)).toBe('ab.zip')
    expect(guvenliDosyaAdi(`a${String.fromCharCode(0)}b${String.fromCharCode(10)}c.zip`)).toBe('abc.zip')
  })
  it('boş ya da aşırı uzun adı güvenli hâle getirir', () => {
    expect(guvenliDosyaAdi('')).toBe('spotify-export.zip')
    expect(guvenliDosyaAdi(`${'x'.repeat(500)}.zip`).length).toBeLessThanOrEqual(120)
  })
})
