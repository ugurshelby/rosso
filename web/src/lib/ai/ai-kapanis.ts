/**
 * AI otomatik kapanış tarihi — "unutsam da fatura çıkmasın" kilidi.
 *
 * Bu tarihte (UTC, dahil) ve sonrasında Vertex/Gemini HİÇ çağrılmaz: `vertexYapilandirmasi()`
 * `null` döner, yani AI kapalı yoldaki (deterministik/SQL fallback) davranış devreye girer.
 * Tek noktadan geçtiği için tüm AI özellikleri (editorial, recap, taste, journey, katalog
 * zenginleştirme) birlikte durur; anahtar Vercel'de kalsa bile kullanılmaz.
 *
 * Yeniden açmak (yalnız sahibin bilinçli kararıyla): Vercel'de `AI_KAPANIS_TARIHI` env'ini
 * daha ileri bir tarihe (YYYY-AA-GG) ya da `yok`'a ayarla. Env'i yanlış yazarsan kilit
 * KAPALI (güvenli) yönde kalır: geçersiz değer = kapanış aktif.
 *
 * Yayın (self-host) kopyasında bu sabit `null`dır: kilit yalnız sahibin kişisel kredisi içindir.
 */
export const AI_KAPANIS_TARIHI: string | null = null

const TARIH = /^\d{4}-\d{2}-\d{2}$/

export function aiKapanisAktif(
  simdi: Date = new Date(),
  env: Record<string, string | undefined> = process.env,
): boolean {
  const ham = env.AI_KAPANIS_TARIHI?.trim()
  const hedef = ham ? (ham.toLowerCase() === 'yok' ? null : ham) : AI_KAPANIS_TARIHI
  if (hedef === null) return false
  if (!TARIH.test(hedef)) return true // bozuk değer → güvenli yön: kapalı
  const kapanis = Date.parse(`${hedef}T00:00:00Z`)
  if (Number.isNaN(kapanis)) return true
  return simdi.getTime() >= kapanis
}
