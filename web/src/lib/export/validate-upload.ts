/** Spotify export ZIP upload doğrulaması — saf, test-edilebilir. */

/**
 * 500 → 200 MB (2026-09-23). Ölçüm: çok yıllık bir genişletilmiş dinleme
 * geçmişi ZIP'i ~10 MB. 200 MB bunun 20 katı pay bırakır; kötü niyetli tek
 * bir yüklemenin depoya ve worker belleğine bindirebileceği yükü 2,5 kat
 * düşürür. Bucket sınırı da aynı (migration 0342) — tarayıcıyı atlayan
 * doğrudan yükleme de sunucuda reddedilir.
 */
export const MAX_ZIP_BYTES = 200 * 1024 * 1024

/**
 * Kötüye kullanım sınırları (veritabanından sayılır — sunucusuz örnekler
 * arasında bellek-içi sayaç paylaşılmaz, bu yüzden asıl sınır DB'de).
 *
 * Spotify en fazla 3 paket verir (dinleme geçmişi, hesap verisi, teknik
 * günlük); aynı anda 3 aktif iş meşru kullanımın tamamını karşılar.
 */
export const AKTIF_IS_SINIRI = 3
/** Bir saatte açılabilecek yükleme sayısı (başarısız denemeler dahil). */
export const SAATLIK_YUKLEME_SINIRI = 10

/** ZIP yerel dosya başlığı imzası: "PK\x03\x04". Boş arşiv: "PK\x05\x06". */
const ZIP_IMZALARI = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
] as const

const ALLOWED_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // bazı tarayıcılar .zip'i böyle gönderir
])

export type UploadValidation =
  | { ok: true }
  | { ok: false; status: 415 | 413 | 400; error: string }

/** Dosya tipi/boyutunu doğrula (mantık; I/O yok). */
export function validateUpload(file: {
  name: string
  type: string
  size: number
}): UploadValidation {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { ok: false, status: 400, error: 'Yalnızca .zip dosyası yükleyebilirsin.' }
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { ok: false, status: 415, error: 'Geçersiz dosya türü — Spotify export ZIP’i yükle.' }
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, status: 400, error: 'Dosya boş görünüyor.' }
  }
  if (file.size > MAX_ZIP_BYTES) {
    return { ok: false, status: 413, error: 'Dosya 200 MB sınırını aşıyor.' }
  }
  return { ok: true }
}

/**
 * İlk baytlar gerçekten ZIP mi? Uzantısı `.zip` yapılmış bir resim/metin
 * dosyası yüklenmeden tarayıcıda yakalanır (worker'a hiç ulaşmaz). Asıl
 * içerik denetimi worker'da (`zip_guard`); bu yalnız ucuz ilk kapı.
 */
export function zipImzasiMi(ilkBaytlar: Uint8Array): boolean {
  return ZIP_IMZALARI.some((imza) => imza.every((b, i) => ilkBaytlar[i] === b))
}

/**
 * Kayıtta saklanacak dosya adı: yol parçaları, kontrol karakterleri ve aşırı
 * uzunluk atılır. Ad yalnız ekranda gösterilir (Storage yolu `userId/jobId.zip`,
 * kullanıcı adına dayanmaz) — ama log/arayüz enjeksiyonuna kapı bırakmayız.
 */
export function guvenliDosyaAdi(ad: string): string {
  const taban = ad.split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  const temiz = taban.replace(/[\u0000-\u001f\u007f<>"'`]/g, '').trim()
  const kisa = temiz.length > 120 ? `${temiz.slice(0, 116)}.zip` : temiz
  return kisa || 'spotify-export.zip'
}
