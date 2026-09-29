'use client'

import { useEffect, useState } from 'react'

/**
 * Kapak görselinden çıkarılan renk çifti — hero arka planını Spotify tarzı
 * "kapaktan sızan" bir gradient'e dönüştürmek için (§ playlist hero redesign).
 *
 * `dominant` doğrudan renk, `muted` arka planla kaynaşsın diye koyulaştırılmış
 * varyant. İkisi de yoksa çağıran taraf CSS `var(--hero-color, fallback)` ile
 * `--color-bg-elevated`'e düşer — burada asla hardcoded hex döndürülmez, yalnız
 * kapaktan örneklenen gerçek renk.
 */
export interface CoverPalette {
  dominant: string | null
  muted: string | null
}

const EMPTY_PALETTE: CoverPalette = { dominant: null, muted: null }

// Modül-içi cache — aynı kapak URL'si iki kez örneklenmez (cover-art.tsx'teki
// `_cache` deseniyle tutarlı).
const _cache = new Map<string, CoverPalette>()

function clamp255(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toHex(r: number, g: number, b: number): string {
  const hex = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/** Arka planla kaynaşsın diye koyulaştırılmış varyant — dominant'ın ~%55'i. */
function toMuted(r: number, g: number, b: number): string {
  const factor = 0.55
  return toHex(r * factor, g * factor, b * factor)
}

/**
 * Küçük bir canvas'a çizip ortalama rengi okur. Spotify CDN görselleri CORS
 * izinli olsa da (`crossOrigin: anonymous`), garantisi yok — canvas "tainted"
 * olursa `getImageData` SecurityError fırlatır; bu durumda sessizce null
 * dönülür (çağıran taraf varsayılan gradient'e düşer, hata fırlatılmaz).
 */
function samplePalette(img: HTMLImageElement): CoverPalette | null {
  const size = 24
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, size, size)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch {
    return null
  }

  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha === undefined || alpha < 200) continue
    r += data[i]!
    g += data[i + 1]!
    b += data[i + 2]!
    count++
  }
  if (count === 0) return null

  r /= count
  g /= count
  b /= count
  return { dominant: toHex(r, g, b), muted: toMuted(r, g, b) }
}

/**
 * Verilen kapak URL'sinden dominant/muted renk çifti çıkarır. `url` null ise
 * (kapak henüz yok / bilinmiyor) boş palet döner — hero varsayılan gradient'e
 * düşer. Renk sadece bir kez örneklenir ve URL bazında cache'lenir.
 */
export function useCoverPalette(url: string | null | undefined): CoverPalette {
  const [palette, setPalette] = useState<CoverPalette>(() =>
    url ? _cache.get(url) ?? EMPTY_PALETTE : EMPTY_PALETTE,
  )

  useEffect(() => {
    // `url` değiştiğinde state'i cache sonucuna göre eşitlemek gerekir
    // (cover-art.tsx'teki aynı desen) — bu senkron setState'ler bilinçli.
    if (!url) {
      setPalette(EMPTY_PALETTE) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const cached = _cache.get(url)
    if (cached) {
      setPalette(cached)
      return
    }

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const result = samplePalette(img) ?? EMPTY_PALETTE
      _cache.set(url, result)
      setPalette(result)
    }
    img.onerror = () => {
      if (cancelled) return
      _cache.set(url, EMPTY_PALETTE)
      setPalette(EMPTY_PALETTE)
    }
    img.src = url

    return () => {
      cancelled = true
    }
  }, [url])

  return palette
}
