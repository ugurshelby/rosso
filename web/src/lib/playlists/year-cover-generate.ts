import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Your Years kapak üretimi — build-time/on-demand statik composite.
 *
 * 2026-09-18 katalog yeniden kurgusu, Sahibin geri bildirimi sonrası
 * (2026-09-18, ilk sürüm "rezalet" bulundu — tek düz görsel + net olmayan
 * font): her yıl FARKLI bir vibe-card arka planı kullanır (deterministik,
 * `YEAR_COVER_POOL`'dan `year % length`), gerçek glassmorphism blur
 * (güçlü blur + yarı saydam renkli katman, düz siyah karartma DEĞİL),
 * yıl sayısı büyük/glow'lu (`shadowBlur`) render edilir.
 *
 * Font: `sharp`'ın SVG text render'ı (librsvg) ilk denemede base64 `@font-face`
 * embedding'ini güvenilir işlemedi (sistem fontuna düştü, "rezalet" geri
 * bildiriminin sebeplerinden biri). Bunun yerine `@napi-rs/canvas` — kendi
 * font motoru, `GlobalFonts.registerFromPath` ile embed edilen fontu garanti
 * render eder — text'i PNG'ye rasterize edip sharp'a composite ediyoruz.
 */

const BUCKET = 'catalog-images'

/** Mood kapaklarında (12 key) KULLANILMAYAN 8 görsel — Your Years kendi havuzunu
 * kullanır, çakışma olmasın. Sırayla değil, `year % 8` ile deterministik seçilir
 * (aynı yıl her seferinde aynı görseli alır, ama tümü aynı kapağı GİYMEZ). */
const YEAR_COVER_POOL = [
  'cloud-spiral-staircase',
  'analog-collector',
  'memory-collector',
  'pastel-pink-ringed-planet',
  'ringed-planets-moons-space',
  'twilight-terraced-hills-monolith',
  'statue-rainbow-prism',
  'white-pink-peony-macro',
]

function coverSlugForYear(year: number): string {
  const idx = ((year % YEAR_COVER_POOL.length) + YEAR_COVER_POOL.length) % YEAR_COVER_POOL.length
  return YEAR_COVER_POOL[idx]!
}

let fontRegistered = false
const FONT_FAMILY = 'RossoYearDisplay'

async function ensureFontRegistered(): Promise<void> {
  if (fontRegistered) return
  const fontPath = path.join(
    process.cwd(),
    'node_modules',
    '@fontsource',
    'archivo-black',
    'files',
    'archivo-black-latin-400-normal.woff',
  )
  GlobalFonts.registerFromPath(fontPath, FONT_FAMILY)
  fontRegistered = true
}

const SIZE = 1000

/** Yıl sayısını glow'lu (shadowBlur) olarak PNG'ye rasterize eder. */
async function renderYearGlyph(year: number): Promise<Buffer> {
  await ensureFontRegistered()
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.round(SIZE * 0.26)}px "${FONT_FAMILY}"`

  // Glow katmanı — aynı metni birkaç kez, güçlü shadowBlur ile arkaya bas.
  // Native `filter: blur()` yerine bu yöntem seçildi: `@napi-rs/canvas`'ın
  // `shadowBlur`'ü glow için tasarlanmış, tek geçişte hem renk hem yayılma verir.
  ctx.shadowColor = 'rgba(245, 240, 255, 0.9)'
  ctx.shadowBlur = 40
  ctx.fillStyle = 'rgba(245, 240, 255, 0.9)'
  for (let i = 0; i < 3; i++) {
    ctx.fillText(String(year), SIZE / 2, SIZE * 0.52)
  }

  // Keskin üst katman — glow'un içinden net kontur okunsun.
  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(String(year), SIZE / 2, SIZE * 0.52)

  return canvas.toBuffer('image/png')
}

/**
 * Bir yıl için kapak üretir: farklı vibe-card arka planı + glassmorphism
 * blur + glow'lu yıl sayısı. Başarısızlıkta `null` döner (hata fırlatmaz) —
 * kapak ikincil, `year_pkg` satırının kendisi kapaksız da geçerli.
 */
export async function generateYearCover(year: number): Promise<string | null> {
  try {
    const slug = coverSlugForYear(year)
    const bgPath = path.join(process.cwd(), 'public', 'vibe-cards', `${slug}.webp`)
    const bg = await readFile(bgPath)

    // Glassmorphism: güçlü blur + yarı saydam RENKLİ katman (düz siyah
    // karartma değil) — cam üzerinden bakılan bir görsel hissi.
    const glassBg = await sharp(bg)
      .resize(SIZE, SIZE, { fit: 'cover' })
      .modulate({ brightness: 0.9, saturation: 1.15 })
      .blur(14)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${SIZE}" height="${SIZE}">
               <defs>
                 <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stop-color="#2a1f3d" stop-opacity="0.35"/>
                   <stop offset="100%" stop-color="#0a0810" stop-opacity="0.65"/>
                 </linearGradient>
               </defs>
               <rect width="100%" height="100%" fill="url(#g)"/>
             </svg>`,
          ),
          blend: 'over',
        },
      ])
      .toBuffer()

    const glyph = await renderYearGlyph(year)

    const final = await sharp(glassBg)
      .composite([{ input: glyph, blend: 'over' }])
      .jpeg({ quality: 88 })
      .toBuffer()

    const supabase = await createServiceClient()
    const storagePath = `year-covers/${year}.jpg`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, final, { contentType: 'image/jpeg', upsert: true })
    if (error) {
      console.error('[year-cover] Storage upload başarısız:', error)
      return null
    }

    return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
  } catch (err) {
    console.error('[year-cover] generateYearCover başarısız:', err)
    return null
  }
}
