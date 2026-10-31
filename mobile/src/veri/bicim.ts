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
