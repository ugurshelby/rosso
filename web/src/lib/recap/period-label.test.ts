import { describe, it, expect } from 'vitest'
import { ayAdiTr, donemEtiketiTr } from './period-label'

describe('recap dönem etiketi — gösterim çevirisi', () => {
  it('İngilizce ay adlarını İngilizce tutar (kanonik biçim)', () => {
    expect(donemEtiketiTr('July 2026')).toBe('July 2026')
    expect(donemEtiketiTr('January 2024')).toBe('January 2024')
    expect(donemEtiketiTr('December 2025')).toBe('December 2025')
  })

  it('yıllık etikete dokunmaz', () => {
    expect(donemEtiketiTr('2025')).toBe('2025')
  })

  it('Türkçe kalanları İngilizceye çevirir', () => {
    expect(donemEtiketiTr('Temmuz 2026')).toBe('July 2026')
    expect(donemEtiketiTr('Ocak 2024')).toBe('January 2024')
    expect(donemEtiketiTr('Aralık 2025')).toBe('December 2025')
  })

  it('tanınmayan değeri olduğu gibi döndürür (sessizce bozmaz)', () => {
    expect(donemEtiketiTr('Foo 2026')).toBe('Foo 2026')
    expect(ayAdiTr('Foo')).toBe('Foo')
    expect(donemEtiketiTr('')).toBe('')
  })

  it('büyük/küçük harf farkını yok sayar', () => {
    expect(ayAdiTr('JULY')).toBe('July')
    expect(ayAdiTr('july')).toBe('July')
    expect(ayAdiTr('TEMMUZ')).toBe('July')
  })

  /**
   * 🔴 Nöbetçi: `period_label` aynı zamanda URL anahtarı ve kapak sanatı tohumu.
   * Çeviri YALNIZ gösterimde olmalı — bu test, yardımcının girdiyi değiştirmediğini
   * (saf fonksiyon olduğunu) ve ham değerin elde kaldığını hatırlatır.
   */
  it('girdiyi mutasyona uğratmaz — ham etiket URL/tohum için korunur', () => {
    const ham = 'Temmuz 2026'
    const gosterim = donemEtiketiTr(ham)
    expect(ham).toBe('Temmuz 2026')
    expect(gosterim).not.toBe(ham)
    expect(gosterim).toBe('July 2026')
  })
})
