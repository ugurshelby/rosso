import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

/**
 * Token şifreleme — Python worker (`worker/app/services/token_cipher.py`) ile
 * BİT BİT AYNI davranmak ZORUNDA. İki taraf da hem okur hem yazar (TS OAuth
 * callback'te şifreler, Python token yenilerken yeniden şifreler), bu yüzden
 * anahtar türetmedeki en küçük sapma her iki yönde de veri kaybıdır.
 *
 * ── Anahtar türetme (FAZ 5, 2026-07-11) ──
 * Yeni: SHA-256(raw) → 32 bayt. İki dilde matematiksel olarak AYNI sonuç.
 *
 * Eski (legacy): TS `raw.slice(0,32)` UTF-8 · Python `raw.encode()[:32]`.
 * Bunlar yalnız anahtar saf ASCII iken tesadüfen örtüşüyordu. Türkçe/çok baytlı
 * karakter girseydi TS 32 KARAKTER (=37 bayt → AES patlar), Python 32 BAYT alırdı.
 * "Çalışıyor" olmasının sebebi ortak bir kural değil, şanstı.
 *
 * ── Geçiş (çift-okuma) ──
 * Yazma HER ZAMAN yeni KDF ile. Okuma önce yeni, olmazsa legacy KDF ile denenir.
 * Böylece mevcut token'lar kesintisiz çözülmeye devam eder ve her yenilenmede
 * kendiliğinden yeni formata göç eder. Legacy dal, tüm token'lar göç ettikten
 * sonra silinecek (bkz. spec FAZ 5).
 */

function rawKey(): string {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be at least 32 chars')
  }
  return raw
}

/** Yeni KDF — Python `hashlib.sha256(raw.encode()).digest()` ile birebir aynı. */
function deriveKey(raw: string): Buffer {
  return createHash('sha256').update(raw, 'utf8').digest()
}

/**
 * Eski KDF — YALNIZ çözmede, yeni KDF başarısız olursa. Asla şifrelemede kullanma.
 * Not: bu dal 32 bayttan farklı uzunluk üretebilir (çok baytlı karakterde) —
 * o durumda createDecipheriv zaten hata verir, biz de legacy denemesini
 * başarısız sayarız. Doğru davranış budur.
 */
function deriveLegacyKey(raw: string): Buffer {
  return Buffer.from(raw.slice(0, 32), 'utf8')
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns base64-encoded `iv:tag:ciphertext`.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, deriveKey(rawKey()), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
}

function decryptWith(key: Buffer, iv: Buffer, tag: Buffer, data: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Decrypts a value produced by `encrypt`.
 * Throws if tampered or wrong key.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  // IV/tag uzunluğunu erken doğrula: bozuk/oynanmış girdide OpenSSL seviyesinden
  // gelen anlamsız hata yerine net bir mesaj ver (teşhis kolaylığı).
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Invalid ciphertext format')
  }

  const raw = rawKey()
  try {
    return decryptWith(deriveKey(raw), iv, tag, data)
  } catch {
    // Geçiş dönemi: eski KDF ile şifrelenmiş token olabilir. Yalnız burada denenir;
    // başarılı olursa çağıran zaten yeni KDF ile yeniden yazacak (göç).
    // Legacy de başarısızsa hata YUTULMAZ — gerçekten çözülemiyor demektir.
    return decryptWith(deriveLegacyKey(raw), iv, tag, data)
  }
}
