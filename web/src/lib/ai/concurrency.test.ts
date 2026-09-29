import { describe, it, expect } from 'vitest'
import { havuzlaCalistir } from './concurrency'

// ---------------------------------------------------------------------------
// concurrency.ts — AI çağrılarının eşzamanlılık sınırı.
//
// Bu bir stil tercihi değil, MALİYET ve KOTA emniyetidir: 2026-09-19'da 12
// mood kürasyonu aynı anda gönderildiğinde Vertex bir çağrıyı 429
// RESOURCE_EXHAUSTED ile reddetti (`ai_generation_logs`'ta kayıtlı). Her 429
// günlük devre kesici sayacını yiyor; yeterince birikirse AI kendini
// gereksiz yere kapatır.
//
// Sınır sessizce bozulursa hiçbir test kırılmazdı — o yüzden asıl test
// "aynı anda kaç iş koştu" invariant'ını ÖLÇÜYOR, sonucu değil.
// ---------------------------------------------------------------------------

/** Verilen gecikmeyle çözülen, eşzamanlı çalışan sayısını kaydeden iş üretir. */
function izlenenIs(gecikmeMs: number) {
  const durum = { anlik: 0, zirve: 0 }
  const fn = async (x: number): Promise<number> => {
    durum.anlik += 1
    durum.zirve = Math.max(durum.zirve, durum.anlik)
    await new Promise((r) => setTimeout(r, gecikmeMs))
    durum.anlik -= 1
    return x * 2
  }
  return { durum, fn }
}

describe('havuzlaCalistir', () => {
  it('aynı anda limitten fazla iş çalıştırmaz', async () => {
    const { durum, fn } = izlenenIs(5)
    await havuzlaCalistir([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3, fn)
    expect(durum.zirve).toBeLessThanOrEqual(3)
  })

  it('limit 1 verilince tamamen sıralı çalışır', async () => {
    const { durum, fn } = izlenenIs(2)
    await havuzlaCalistir([1, 2, 3, 4], 1, fn)
    expect(durum.zirve).toBe(1)
  })

  it('sonuçları GİRDİ sırasında döndürür (tamamlanma sırasında değil)', async () => {
    // İlk iş en yavaş: tamamlanma sırası girdi sırasının tersi olur.
    const gecikmeler = [30, 20, 10, 0]
    const sonuclar = await havuzlaCalistir(gecikmeler, 4, async (ms) => {
      await new Promise((r) => setTimeout(r, ms))
      return ms
    })
    expect(sonuclar.map((s) => (s.status === 'fulfilled' ? s.value : null))).toEqual([30, 20, 10, 0])
  })

  it('bir iş patlarsa diğerleri tamamlanır (allSettled sözleşmesi)', async () => {
    const sonuclar = await havuzlaCalistir([1, 2, 3], 2, async (x) => {
      if (x === 2) throw new Error('patladi')
      return x
    })

    expect(sonuclar[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(sonuclar[1].status).toBe('rejected')
    expect(sonuclar[2]).toEqual({ status: 'fulfilled', value: 3 })
  })

  it('boş girdi için hiç iş çalıştırmaz', async () => {
    let cagrildi = 0
    const sonuclar = await havuzlaCalistir([], 3, async () => {
      cagrildi += 1
      return 1
    })
    expect(cagrildi).toBe(0)
    expect(sonuclar).toHaveLength(0)
  })

  it('limit girdi sayısından büyükse fazladan işçi açmaz', async () => {
    const { durum, fn } = izlenenIs(5)
    await havuzlaCalistir([1, 2], 50, fn)
    expect(durum.zirve).toBeLessThanOrEqual(2)
  })

  it('her öğe TAM BİR KEZ işlenir', async () => {
    const gorulen: number[] = []
    const girdi = Array.from({ length: 25 }, (_, i) => i)
    await havuzlaCalistir(girdi, 4, async (x) => {
      gorulen.push(x)
      return x
    })
    expect(gorulen.sort((a, b) => a - b)).toEqual(girdi)
  })
})
