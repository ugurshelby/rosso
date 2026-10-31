/** Saf biçim yardımcıları (yerel modül yok; testlerde doğrudan çalışır). */

/** `tracks.artists` metin dizisi ya da düz metin olabilir. */
export function sanatciMetni(artists: unknown): string {
  if (Array.isArray(artists)) return artists.filter((a) => typeof a === 'string').join(', ')
  return typeof artists === 'string' ? artists : ''
}

/** 125 dk → "2 sa 5 dk"; 1 günden uzunsa gün de yazılır. */
export function sureMetni(ms: number | null | undefined): string {
  const dakika = Math.max(0, Math.round((ms ?? 0) / 60000))
  const gun = Math.floor(dakika / 1440)
  const saat = Math.floor((dakika % 1440) / 60)
  const dk = dakika % 60
  if (gun > 0) return `${gun} g ${saat} sa`
  if (saat > 0) return `${saat} sa ${dk} dk`
  return `${dk} dk`
}

/** Yerel saatle ayın ilk anı (web panosunun "ay" dönemi). */
export function ayBaslangici(simdi = new Date()): Date {
  return new Date(simdi.getFullYear(), simdi.getMonth(), 1)
}

/** Aynı şarkı art arda dinlendiyse rayda bir kez görünsün; sıra korunur. */
export function tekillestir<T extends { trackId: string }>(liste: T[], enCok: number): T[] {
  const gorulen = new Set<string>()
  const sonuc: T[] = []
  for (const o of liste) {
    if (gorulen.has(o.trackId)) continue
    gorulen.add(o.trackId)
    sonuc.push(o)
    if (sonuc.length >= enCok) break
  }
  return sonuc
}

/** Geçmiş dönem hapları (spec §9.5). */
export type Donem = 'bugun' | '7gun' | '30gun' | 'yil'

export const DONEM_ETIKETI: Record<Donem, string> = {
  bugun: 'Bugün',
  '7gun': '7 gün',
  '30gun': '30 gün',
  yil: 'Yıl',
}

/** Yerel saatle dönemin başı: bugün gece yarısı, son 7/30 gün, yılın ilk günü. */
export function donemBaslangici(donem: Donem, simdi = new Date()): Date {
  const gece = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate())
  if (donem === 'bugun') return gece
  if (donem === '7gun') return new Date(gece.getTime() - 6 * 86400000)
  if (donem === '30gun') return new Date(gece.getTime() - 29 * 86400000)
  return new Date(simdi.getFullYear(), 0, 1)
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

/** Gün başlığı: "Bugün", "Dün", yoksa "28 Ekim" (yıl farklıysa yılla). */
export function gunBasligi(iso: string, simdi = new Date()): string {
  const t = new Date(iso)
  const gun = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const fark = Math.round((gun(simdi) - gun(t)) / 86400000)
  if (fark === 0) return 'Bugün'
  if (fark === 1) return 'Dün'
  const metin = `${t.getDate()} ${AYLAR[t.getMonth()]}`
  return t.getFullYear() === simdi.getFullYear() ? metin : `${metin} ${t.getFullYear()}`
}

/** "14:05" — yerel saat. */
export function saatMetni(iso: string): string {
  const t = new Date(iso)
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

/** Düz dinleme listesine gün başlıklarını yerleştirir (FlashList yapışkan başlıkları için). */
export function gunlereBol<T extends { zaman: string }>(
  liste: T[],
  simdi = new Date(),
): { ogeler: ({ tur: 'baslik'; baslik: string; anahtar: string } | { tur: 'oge'; oge: T; anahtar: string })[]; basliklar: number[] } {
  const ogeler: ({ tur: 'baslik'; baslik: string; anahtar: string } | { tur: 'oge'; oge: T; anahtar: string })[] = []
  const basliklar: number[] = []
  let son = ''
  liste.forEach((o, i) => {
    const b = gunBasligi(o.zaman, simdi)
    if (b !== son) {
      basliklar.push(ogeler.length)
      ogeler.push({ tur: 'baslik', baslik: b, anahtar: `b-${b}` })
      son = b
    }
    ogeler.push({ tur: 'oge', oge: o, anahtar: `o-${i}` })
  })
  return { ogeler, basliklar }
}

/** Mobilden yüklenen ZIP (spec §9.7). */
export interface SecilenDosya {
  uri: string
  ad: string
  boyut: number
}

export const EN_BUYUK_ZIP = 200 * 1024 * 1024

export function zipKontrol(d: SecilenDosya): string | null {
  if (!/\.zip$/i.test(d.ad)) return 'Spotify\'dan gelen .zip dosyasını seç.'
  if (d.boyut > EN_BUYUK_ZIP) return 'Dosya 200 MB\'tan büyük.'
  if (d.boyut <= 0) return 'Dosya boş görünüyor.'
  return null
}
