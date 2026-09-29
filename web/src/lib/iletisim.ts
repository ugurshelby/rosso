/**
 * İletişim adresleri — TEK doğruluk kaynağı.
 *
 * ─── Neden bu dosya var ─────────────────────────────────────────────────
 * 2026-08-19 refine taramasında yakalandı: `/help` `destek@rosso.app`,
 * `/privacy` `privacy@rosso.app` gösteriyordu. **`rosso.app` bize ait
 * değil** — `docs/reference/mobil-ekran-denetimi-2026-08-05.md`'de
 * ölçülmüş: o alan adı Ema Health S.r.l. adlı başka bir şirkete ait.
 *
 * Yani kullanıcı KVKK talebini yabancı bir şirkete yazıyordu. Mobil
 * tarafında bu yakalanıp düzeltilmişti, web'de iki sayfada kalmıştı —
 * "aynı hata iki yüzeyde, biri düzelmiş öteki unutulmuş" kalıbı.
 *
 * ─── Neden env, neden sabit değil ───────────────────────────────────────
 * Adres alan adına bağlı ve alan adı henüz kesinleşmedi. Env'e bağlamak
 * kod değişikliği olmadan güncellenebilmesini sağlar. Tanımsızken
 * UYDURMA bir adres göstermek yerine `null` dönüyoruz: çağıran taraf
 * e-posta bloğunu hiç göstermez ve kullanıcıyı çalışan bir yola
 * (uygulama içi ayarlar) yönlendirir. Cevapsız kalacak bir adres
 * göstermek, hiç göstermemekten daha kötüdür.
 */

/** Bize ait OLMAYAN alan adı — bkz. dosya başındaki not. */
const YASAKLI_ALAN = 'rosso.app'

/** Genel destek adresi — tanımsızsa `null`. */
export function destekEpostasi(): string | null {
  return gecerliEposta(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)
}

/**
 * KVKK / gizlilik başvuru adresi.
 *
 * Ayrı bir env: gizlilik başvuruları yasal olarak takip edilmesi gereken
 * bir kanal, genel destekle aynı kutuya düşmesi şart değil. Tanımsızsa
 * destek adresine düşer — böylece en azından bir kanal her zaman doğru.
 */
export function gizlilikEpostasi(): string | null {
  return gecerliEposta(process.env.NEXT_PUBLIC_PRIVACY_EMAIL) ?? destekEpostasi()
}

/**
 * Boş/whitespace/placeholder değerleri eler.
 *
 * ⚠ `rosso.app` açıkça reddediliyor: env yanlışlıkla eski değerle
 * doldurulursa sessizce yabancı bir alana yönlendirmemeli. Nöbetçi
 * kodun içinde — belgeye güvenmek yetmez, aynı hata bir kez yapıldı.
 */
function gecerliEposta(ham: string | undefined): string | null {
  const deger = ham?.trim()
  if (!deger) return null

  const alan = deger.split('@')[1]?.toLowerCase()
  if (!alan) return null

  /*
   * ⚠ Alt alan adları da reddedilir (kendi kodumu gözden geçirirken
   * düzeltildi, 2026-08-20): ilk yazımda `endsWith('@rosso.app')` vardı ve
   * `x@mail.rosso.app` bu süzgeçten GEÇİYORDU — ölçüldü. Yasak olan tek bir
   * adres değil, BİZE AİT OLMAYAN ALAN ADININ tamamı.
   */
  if (alan === YASAKLI_ALAN || alan.endsWith('.' + YASAKLI_ALAN)) return null

  return deger
}

