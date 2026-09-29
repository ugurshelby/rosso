// Route parametre doğrulama yardımcıları (URL güvenliği).
// Dinamik route parametreleri DB'ye/RPC'ye gitmeden en erken noktada doğrulanır:
// geçersiz/aşırı uzun/tuhaf karakterli girdi reddedilir (URL-hack savunması).
// RLS + parametrize sorgu zaten kök koruma; bu ek savunma katmanı + gürültü azaltır.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** UUID biçimi doğru mu? */
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
