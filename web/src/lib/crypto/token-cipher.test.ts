import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Must set env before importing (server-only is mocked in vitest setup)
const TEST_KEY = 'test-key-that-is-exactly-32chars!'

describe('token-cipher', () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TOKEN_ENCRYPTION_KEY
    } else {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey
    }
  })

  it('round-trips plaintext', async () => {
    const { encrypt, decrypt } = await import('./token-cipher')
    const plain = 'super-secret-oauth-token'
    const cipher = encrypt(plain)
    expect(decrypt(cipher)).toBe(plain)
  })

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const { encrypt } = await import('./token-cipher')
    const plain = 'same-input'
    expect(encrypt(plain)).not.toBe(encrypt(plain))
  })

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('./token-cipher')
    const cipher = encrypt('hello')
    const tampered = cipher.slice(0, -4) + 'XXXX'
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws when key is missing', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    // Re-import to pick up missing key at call time
    const { encrypt } = await import('./token-cipher')
    expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY')
  })

  // ── FAZ 5 (2026-07-11): KDF sözleşmesi ────────────────────────────────────
  // Python worker (`worker/app/services/token_cipher.py`) ile BİT BİT aynı bayt
  // türetmek zorundayız — iki taraf da hem okur hem yazar. Aşağıdaki testler,
  // eskiden "tesadüfen çalışan" uyumu bir SÖZLEŞMEYE çevirir.

  it('anahtar SHA-256 ile türetilir (Python hashlib.sha256 ile birebir)', async () => {
    const { createCipheriv, createHash, randomBytes } = await import('crypto')
    const { decrypt } = await import('./token-cipher')

    // Python tarafının ürettiği baytı burada bağımsızca hesapla:
    const pythonKey = createHash('sha256').update(TEST_KEY, 'utf8').digest()
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', pythonKey, iv)
    const data = Buffer.concat([c.update('python-yazdi', 'utf8'), c.final()])
    const ct = [
      iv.toString('base64'),
      c.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join(':')

    // TS bunu çözebiliyorsa iki dil aynı anahtarı türetiyor demektir.
    expect(decrypt(ct)).toBe('python-yazdi')
  })

  it('LEGACY KDF ile şifrelenmiş token hâlâ çözülür (çift-okuma geçişi)', async () => {
    const { createCipheriv, randomBytes } = await import('crypto')
    const { decrypt } = await import('./token-cipher')

    // Üretimdeki mevcut token'lar bu eski yöntemle şifrelendi. Çözemezsek
    // tüm kullanıcılar platform bağlantısını kaybeder — geçişin kalbi bu.
    const legacyKey = Buffer.from(TEST_KEY.slice(0, 32), 'utf8')
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', legacyKey, iv)
    const data = Buffer.concat([c.update('eski-token', 'utf8'), c.final()])
    const ct = [
      iv.toString('base64'),
      c.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join(':')

    expect(decrypt(ct)).toBe('eski-token')
  })

  it('encrypt HER ZAMAN yeni KDF ile yazar (legacy ile çözülemez)', async () => {
    const { createDecipheriv, createHash } = await import('crypto')
    const { encrypt } = await import('./token-cipher')

    const [ivB, tagB, dataB] = encrypt('x').split(':')
    const iv = Buffer.from(ivB, 'base64')
    const tag = Buffer.from(tagB, 'base64')
    const data = Buffer.from(dataB, 'base64')

    // Yeni KDF ile çözülmeli
    const newKey = createHash('sha256').update(TEST_KEY, 'utf8').digest()
    const d = createDecipheriv('aes-256-gcm', newKey, iv)
    d.setAuthTag(tag)
    expect(Buffer.concat([d.update(data), d.final()]).toString('utf8')).toBe('x')

    // Legacy KDF ile ÇÖZÜLEMEMELİ — yoksa göç hiç ilerlemez
    const legacyKey = Buffer.from(TEST_KEY.slice(0, 32), 'utf8')
    expect(() => {
      const dl = createDecipheriv('aes-256-gcm', legacyKey, iv)
      dl.setAuthTag(tag)
      Buffer.concat([dl.update(data), dl.final()])
    }).toThrow()
  })

  it('64 karakterlik anahtar artık ÇALIŞIR (eski tuzak kalktı)', async () => {
    // ESKİDEN: `openssl rand -hex 32` (64 char) → Python fromhex, TS UTF-8 slice
    // → farklı bayt → tüm token'lar sessizce ölürdü. Bu yüzden 64-char açıkça
    // reddediliyordu. SHA-256 ile anahtarın uzunluğu/alfabesi artık önemsiz.
    process.env.TOKEN_ENCRYPTION_KEY = 'f'.repeat(64)
    const { encrypt, decrypt } = await import('./token-cipher')
    expect(decrypt(encrypt('tok'))).toBe('tok')
  })
})
