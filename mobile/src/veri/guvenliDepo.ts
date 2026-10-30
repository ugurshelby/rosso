import * as SecureStore from 'expo-secure-store'

/**
 * Supabase oturumu için güvenli depo (mimari M6, PLAN 4.6). Oturum JSON'u
 * SecureStore'un tek değer sınırını (~2 KB) aşabildiği için parçalara bölünür;
 * token hiçbir zaman AsyncStorage'a (şifresiz) yazılmaz.
 *   <anahtar>.n = parça sayısı · <anahtar>.0 … <anahtar>.(n-1) = parçalar
 */
const PARCA = 1800

/** SecureStore anahtarı yalnız [A-Za-z0-9._-] kabul eder. */
function temizAnahtar(anahtar: string) {
  return anahtar.replace(/[^A-Za-z0-9._-]/g, '_')
}

export const guvenliDepo = {
  async getItem(anahtar: string): Promise<string | null> {
    const k = temizAnahtar(anahtar)
    const sayi = Number(await SecureStore.getItemAsync(`${k}.n`))
    if (!Number.isInteger(sayi) || sayi <= 0) return null
    const parcalar: string[] = []
    for (let i = 0; i < sayi; i++) {
      const p = await SecureStore.getItemAsync(`${k}.${i}`)
      if (p === null) return null // yarım yazılmış oturum: yok say, yeniden giriş
      parcalar.push(p)
    }
    return parcalar.join('')
  },

  async setItem(anahtar: string, deger: string): Promise<void> {
    const k = temizAnahtar(anahtar)
    const eskiSayi = Number(await SecureStore.getItemAsync(`${k}.n`)) || 0
    const sayi = Math.max(1, Math.ceil(deger.length / PARCA))
    for (let i = 0; i < sayi; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, deger.slice(i * PARCA, (i + 1) * PARCA))
    }
    await SecureStore.setItemAsync(`${k}.n`, String(sayi))
    for (let i = sayi; i < eskiSayi; i++) await SecureStore.deleteItemAsync(`${k}.${i}`)
  },

  async removeItem(anahtar: string): Promise<void> {
    const k = temizAnahtar(anahtar)
    const sayi = Number(await SecureStore.getItemAsync(`${k}.n`)) || 0
    for (let i = 0; i < sayi; i++) await SecureStore.deleteItemAsync(`${k}.${i}`)
    await SecureStore.deleteItemAsync(`${k}.n`)
  },
}
