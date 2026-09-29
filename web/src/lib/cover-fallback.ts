/**
 * Kapağı olmayan içerik için deterministik gradyan.
 * Otorite: docs/design/katmanlar/dashboard-design.md §3.7
 *
 * "Kapağı olmayan içerik boş gri kutu bırakılmaz." Kapak URL'i yoksa şarkı
 * adı + sanatçıdan türetilen sabit bir gradyan üretilir: aynı şarkı her
 * zaman aynı kapağı alır. Hue morun çevresinde dar bir aralıkta kalır
 * (~223-273) — böylece üretilen kapaklar arayüzün tek renkli dilinden
 * kopmaz, ama birbirinden ayrışır.
 */

/** Basit, hızlı, deterministik string hash (referans HTML ile aynı davranış). */
function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

export interface CoverFallback {
  /** `background` değeri — gradyan + sol üstten gelen zayıf parlaklık */
  background: string
  /** Düşük opaklıkta gösterilecek baş harf */
  initial: string
}

/**
 * @param title  Şarkı/playlist adı (baş harf buradan gelir)
 * @param subtitle Sanatçı adı vb. — hash'e karışır, aynı adlı farklı
 *                 şarkıların aynı kapağı almasını engeller
 */
export function coverFallback(title: string, subtitle = ''): CoverFallback {
  const h = hash(`${title}${subtitle}`)

  // Mor çevresinde dar hue aralığı: 248 ± 25 → ~223-273
  const base = (248 + ((h % 50) - 25) + 360) % 360
  const second = (base + 18 + ((h >> 7) % 22)) % 360

  const c1 = `hsl(${base} ${34 + ((h >> 3) % 22)}% ${26 + ((h >> 5) % 14)}%)`
  const c2 = `hsl(${second} ${26 + ((h >> 9) % 20)}% ${11 + ((h >> 11) % 9)}%)`

  return {
    background:
      `radial-gradient(120% 120% at 18% 12%, rgba(255,255,255,.10), transparent 58%),` +
      `linear-gradient(145deg, ${c1}, ${c2})`,
    initial: (title.trim().charAt(0) || '·').toLocaleUpperCase('en-US'),
  }
}
