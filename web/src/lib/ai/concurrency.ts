/**
 * Sınırlı eşzamanlılık yardımcısı.
 *
 * NEDEN AYRI DOSYA: `mood-pkg.ts` `server-only` ve Supabase istemcisi çeker;
 * bu saf mantığı orada tutmak test edilemez hale getirirdi. Eşzamanlılık
 * sınırı bir MALİYET ve KOTA emniyetidir — test edilebilir olması şart.
 *
 * 🔴 NEDEN VAR (ölçüldü, 2026-09-19): 12 mood kürasyonu `Promise.allSettled`
 * ile aynı anda gönderiliyordu ve Vertex bir çağrıyı **429 RESOURCE_EXHAUSTED**
 * ile reddetti. Her 429 hem kürasyon kalitesini düşürüyor (o mood SQL
 * fallback'ine düşüyor) hem de günlük devre kesici sayacını (8 hata) yiyor —
 * arka arkaya birkaç tur böyle giderse AI kendini gereksiz yere kapatırdı.
 *
 * `docs/reference/rosso-ai-integration.md` revizyon §3B: *"concurrency = 3"*.
 */

/**
 * `Promise.allSettled` ile aynı sözleşme — sıra korunur, hata fırlatmaz —
 * tek fark: aynı anda en fazla `limit` iş çalışır.
 *
 * @param limit 1'den küçük verilirse 1'e yükseltilir (sıralı çalışma).
 */
export async function havuzlaCalistir<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const sonuclar = new Array<PromiseSettledResult<R>>(items.length)
  if (items.length === 0) return sonuclar

  let sonraki = 0

  const isci = async (): Promise<void> => {
    for (;;) {
      const i = sonraki
      sonraki += 1
      if (i >= items.length) return
      try {
        sonuclar[i] = { status: 'fulfilled', value: await fn(items[i]) }
      } catch (reason) {
        sonuclar[i] = { status: 'rejected', reason }
      }
    }
  }

  const isciSayisi = Math.min(Math.max(Math.floor(limit), 1), items.length)
  await Promise.all(Array.from({ length: isciSayisi }, isci))
  return sonuclar
}

/**
 * Süreç içi sayaçlı semafor — AYNI ANDA en fazla `limit` iş.
 *
 * `havuzlaCalistir` tek bir listenin eşzamanlılığını sınırlar; bu ise farklı
 * listelerden gelen işlerin TOPLAMINI sınırlar. Neden gerekti (2026-09-23,
 * 1000 kullanıcı ölçeği): mood turu artık iki kullanıcıyı paralel işliyor;
 * her kullanıcının 12 mood'u kendi içinde 3'lü havuzda koşarken Vertex'e
 * giden toplam çağrı 6 olurdu. Ölçülen 429 eşiği (12 eşzamanlı) altında
 * kalmak için AI çağrısının KENDİSİ bu semafordan geçer.
 */
export class Semafor {
  private bos: number
  private readonly bekleyenler: Array<() => void> = []

  constructor(limit: number) {
    this.bos = Math.max(Math.floor(limit), 1)
  }

  async calistir<R>(fn: () => Promise<R>): Promise<R> {
    if (this.bos > 0) {
      this.bos -= 1
    } else {
      await new Promise<void>((coz) => this.bekleyenler.push(coz))
    }
    try {
      return await fn()
    } finally {
      const siradaki = this.bekleyenler.shift()
      if (siradaki) siradaki()
      else this.bos += 1
    }
  }
}
