import { describe, it, expect, vi } from 'vitest'
import { siraylaIsleCekirdek, type SiraErisimi } from './kullanici-sirasi'

/** Bellekte sıra: `al` sırayla verir, `tamamla` çağrılarını kaydeder. */
function sahteSira(kullanicilar: string[]) {
  const kalan = [...kullanicilar]
  const tamamlananlar: Array<{ userId: string; hata: string | null }> = []
  const erisim: SiraErisimi = {
    al: vi.fn(async () => kalan.shift() ?? null),
    tamamla: vi.fn(async (userId: string, hata: string | null) => {
      tamamlananlar.push({ userId, hata })
    }),
  }
  return { erisim, tamamlananlar, kalan }
}

describe('siraylaIsleCekirdek', () => {
  it('sıradaki herkesi işler ve her birini tamamlandı diye yazar', async () => {
    const { erisim, tamamlananlar } = sahteSira(['a', 'b', 'c'])
    const sonuc = await siraylaIsleCekirdek(erisim, {
      eszamanlilik: 2,
      baslangic: 0,
      butceMs: 1_000,
      simdi: () => 0,
      isle: async () => {},
    })
    expect(sonuc.islenen).toBe(3)
    expect(sonuc.butceDoldu).toBe(false)
    expect(tamamlananlar.map((t) => t.userId).sort()).toEqual(['a', 'b', 'c'])
    expect(tamamlananlar.every((t) => t.hata === null)).toBe(true)
  })

  it('🔴 bir kullanıcının hatası turu DURDURMAZ; hata sıraya yazılır', async () => {
    const { erisim, tamamlananlar } = sahteSira(['bozuk', 'saglam'])
    const sonuc = await siraylaIsleCekirdek(erisim, {
      eszamanlilik: 1,
      baslangic: 0,
      butceMs: 1_000,
      simdi: () => 0,
      isle: async (uid) => {
        if (uid === 'bozuk') throw new Error('rpc patladı')
      },
    })
    expect(sonuc.islenen).toBe(1)
    expect(sonuc.hatali).toBe(1)
    expect(tamamlananlar).toContainEqual({ userId: 'bozuk', hata: 'rpc patladı' })
    expect(tamamlananlar).toContainEqual({ userId: 'saglam', hata: null })
  })

  it('bütçe dolunca YENİ kullanıcı almaz — kalanlar sırada bekler', async () => {
    const { erisim, kalan } = sahteSira(['a', 'b', 'c', 'd'])
    let saat = 0
    const sonuc = await siraylaIsleCekirdek(erisim, {
      eszamanlilik: 1,
      baslangic: 0,
      butceMs: 250,
      simdi: () => saat,
      isle: async () => {
        saat += 100 // her kullanıcı 100 ms sürüyor
      },
    })
    // 0, 100, 200'de başlar; 300'de bütçe (250) doldu.
    expect(sonuc.islenen).toBe(3)
    expect(sonuc.butceDoldu).toBe(true)
    expect(kalan).toEqual(['d'])
  })

  it('eşzamanlılık sınırını aşmaz', async () => {
    const { erisim } = sahteSira(['a', 'b', 'c', 'd', 'e', 'f'])
    let ayni = 0
    let enCok = 0
    await siraylaIsleCekirdek(erisim, {
      eszamanlilik: 3,
      baslangic: 0,
      butceMs: 1_000,
      simdi: () => 0,
      isle: async () => {
        ayni += 1
        enCok = Math.max(enCok, ayni)
        await new Promise((r) => setTimeout(r, 5))
        ayni -= 1
      },
    })
    expect(enCok).toBe(3)
  })

  it('sıra boşsa hiç iş yapmadan döner', async () => {
    const { erisim } = sahteSira([])
    const isle = vi.fn()
    const sonuc = await siraylaIsleCekirdek(erisim, {
      eszamanlilik: 4,
      baslangic: 0,
      butceMs: 1_000,
      simdi: () => 0,
      isle,
    })
    expect(isle).not.toHaveBeenCalled()
    expect(sonuc.islenen).toBe(0)
  })
})
