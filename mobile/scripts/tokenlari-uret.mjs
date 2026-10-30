#!/usr/bin/env node
/**
 * Renk token'larının TEK kaynağı web `src/app/globals.css` (mobile-design.md §3).
 * React Native `oklch` okumaz → bu betik hex'e çevirip `src/tema/renkler.ts`'i yazar.
 *   node scripts/tokenlari-uret.mjs            # yaz
 *   node scripts/tokenlari-uret.mjs --kontrol  # güncel değilse çıkış 1 (CI)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = join(KOK, '..', 'web', 'src', 'app', 'globals.css')
const HEDEF = join(KOK, 'src', 'tema', 'renkler.ts')

/** CSS adı → TS adı. Sıra çıktıda korunur. */
const TOKENLAR = {
  bg: 'zemin',
  'elev-0': 'yuzey0',
  'elev-1': 'yuzey1',
  'elev-2': 'yuzey2',
  'elev-3': 'yuzey3',
  'edge-1': 'kenar1',
  'edge-2': 'kenar2',
  'edge-3': 'kenar3',
  text: 'metin',
  muted: 'sonuk',
  faint: 'silik',
  accent: 'vurgu',
  'accent-hover': 'vurguBasili',
  'on-accent': 'vurguUstu',
  glow: 'parilti',
  'color-success': 'basari',
  'color-warning': 'uyari',
  'color-error': 'hata',
  'on-error': 'hataUstu',
  'color-spotify': 'spotify',
}

export function oklchHex(L, C, h, alfa = 1) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3]
  const dogrusal = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const gama = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
  const kanal = (x) => Math.round(Math.min(1, Math.max(0, gama(x))) * 255).toString(16).padStart(2, '0')
  const hex = '#' + dogrusal.map(kanal).join('')
  return alfa < 1 ? hex + Math.round(alfa * 255).toString(16).padStart(2, '0') : hex
}

function degerCoz(ad, tablo, derinlik = 0) {
  const ham = tablo.get(ad)
  if (ham === undefined) throw new Error(`token yok: --${ad}`)
  const v = ham.trim()
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (ref) {
    if (derinlik > 5) throw new Error(`döngü: --${ad}`)
    return degerCoz(ref[1], tablo, derinlik + 1)
  }
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) return v.toLowerCase()
  const o = v.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/)
  if (!o) throw new Error(`çözülemeyen değer --${ad}: ${v}`)
  const alfa = o[4] === undefined ? 1 : o[4].endsWith('%') ? parseFloat(o[4]) / 100 : parseFloat(o[4])
  return oklchHex(parseFloat(o[1]) / 100, parseFloat(o[2]), parseFloat(o[3]), alfa)
}

export function uret(css) {
  // İlk tanım kazanır (`:root` bloğu dosyanın başında).
  const tablo = new Map()
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!tablo.has(m[1])) tablo.set(m[1], m[2])
  const satirlar = Object.entries(TOKENLAR).map(([css, ts]) => `  ${ts}: '${degerCoz(css, tablo)}', // --${css}`)
  return `// ÜRETİLDİ: scripts/tokenlari-uret.mjs — elle düzenleme. Kaynak: web/src/app/globals.css\n\nexport const renk = {\n${satirlar.join('\n')}\n} as const\n\nexport type RenkAdi = keyof typeof renk\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cikti = uret(readFileSync(CSS, 'utf8'))
  if (process.argv.includes('--kontrol')) {
    const mevcut = existsSync(HEDEF) ? readFileSync(HEDEF, 'utf8').replace(/\r\n/g, '\n') : ''
    if (mevcut !== cikti) {
      console.error('src/tema/renkler.ts güncel değil: `npm run tokenlar` çalıştır ve commit et.')
      process.exit(1)
    }
    console.log('renk token\'ları güncel')
  } else {
    writeFileSync(HEDEF, cikti)
    console.log(`yazıldı: ${Object.keys(TOKENLAR).length} renk → src/tema/renkler.ts`)
  }
}
