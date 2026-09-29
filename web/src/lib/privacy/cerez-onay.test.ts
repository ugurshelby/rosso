import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CEREZ_ANAHTARI,
  CEREZ_OLAYI,
  cerezKarariniOku,
  cerezKarariniSifirla,
  cerezKarariniYaz,
} from './cerez-onay'

/**
 * Bu testlerin varlık sebebi: "Reddet" düğmesi aylarca hiçbir şeyi
 * reddetmiyordu (iki düğme de aynı fonksiyonu çağırıyordu). Rıza mantığı
 * sessizce bozulabilen türden bir şey — yanlış çalıştığında ekranda bir
 * hata görünmez, yalnız kullanıcının seçimi yok sayılır.
 */
describe('çerez rızası', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('karar verilmemişse null döner — susmak rıza değildir', () => {
    expect(cerezKarariniOku()).toBeNull()
  })

  it('kabul ve ret kararlarını saklar', () => {
    cerezKarariniYaz('kabul')
    expect(cerezKarariniOku()).toBe('kabul')

    cerezKarariniYaz('ret')
    expect(cerezKarariniOku()).toBe('ret')
  })

  it('eski "true" kaydını rıza SAYMAZ (geriye uyum)', () => {
    // Eski sürüm banner kapanınca 'true' yazıyordu; o değer "ölçüme izin
    // verildi" demek DEĞİLDİ. Rıza sayılsaydı, hiç verilmemiş bir izni
    // verilmiş kabul etmiş olurduk.
    window.localStorage.setItem(CEREZ_ANAHTARI, 'true')
    expect(cerezKarariniOku()).toBeNull()
  })

  it('tanınmayan değeri kararsız sayar', () => {
    window.localStorage.setItem(CEREZ_ANAHTARI, 'evet-belki')
    expect(cerezKarariniOku()).toBeNull()
  })

  it('sıfırlama kararı siler — rıza geri alınabilir olmalı', () => {
    cerezKarariniYaz('kabul')
    cerezKarariniSifirla()
    expect(cerezKarariniOku()).toBeNull()
  })

  it('karar değişince olay yayınlar (ölçüm sayfa yenilenmeden açılır)', () => {
    const dinleyici = vi.fn()
    window.addEventListener(CEREZ_OLAYI, dinleyici)
    cerezKarariniYaz('kabul')
    window.removeEventListener(CEREZ_OLAYI, dinleyici)

    expect(dinleyici).toHaveBeenCalledTimes(1)
  })

  it('depolama patlarsa çökmez, kararsız döner', () => {
    const okuma = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage disabled')
      })

    expect(() => cerezKarariniOku()).not.toThrow()
    expect(cerezKarariniOku()).toBeNull()
    okuma.mockRestore()
  })
})
