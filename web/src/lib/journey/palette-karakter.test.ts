import { describe, it, expect } from 'vitest'
import {
  getJourneyYearColors,
  applyYearCharacter,
  characterAngle,
  characterFocusX,
  type YearCharacter,
} from './palette'

/**
 * Yıl karakteri testleri — 2026-08-13, Sahibin talimatı.
 *
 * Korunan şart: *"yılların karakteri yok veriye göre"*. Bu testler iki
 * şeyi birden garanti ediyor:
 *   ① farklı karakterdeki yıllar FARKLI görünüyor (asıl istek)
 *   ② renk hiçbir kombinasyonda okunamaz hâle gelmiyor (WCAG tabanı)
 */

/** WCAG relative luminance — testin kendi bağımsız ölçümü. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(h.slice(i, i + 2), 16) / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Beyaz metnin bu arka planla kontrastı. */
function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05)
}

const NOTR: YearCharacter = { intensity: 0.5, discovery: 0.5, spread: 0.5 }

describe('applyYearCharacter — karakter gerçekten ayrışıyor mu', () => {
  it('zirve yılı ile sönük yıl AYNI görünmez', () => {
    /*
     * Asıl şikâyet buydu: iki yıl aynı sıradaysa aynı renkti.
     * Aynı konum + farklı yoğunluk → farklı renk olmak ZORUNDA.
     */
    const base = getJourneyYearColors(2, 6)
    const zirve = applyYearCharacter(base, { ...NOTR, intensity: 1 })
    const sonuk = applyYearCharacter(base, { ...NOTR, intensity: 0.05 })

    expect(zirve.from).not.toBe(sonuk.from)
    // Zirve yılı gözle görülür şekilde DAHA parlak olmalı.
    expect(luminance(zirve.from)).toBeGreaterThan(luminance(sonuk.from))
  })

  it('keşif yılı ile kapalı yıl farklı SICAKLIKTA', () => {
    const base = getJourneyYearColors(2, 6)
    const kesif = applyYearCharacter(base, { ...NOTR, discovery: 1 })
    const kapali = applyYearCharacter(base, { ...NOTR, discovery: 0 })

    expect(kesif.accent).not.toBe(kapali.accent)
  })

  it('nötr karakter temel rengi büyük ölçüde korur', () => {
    // Karakter sinyali yoksa yolculuk gradyanı bozulmamalı.
    const base = getJourneyYearColors(3, 7)
    const out = applyYearCharacter(base, NOTR)
    expect(Math.abs(luminance(out.from) - luminance(base.from))).toBeLessThan(0.06)
  })

  it('yolculuğun farklı noktalarındaki iki yıl da ayrışır', () => {
    // Konum + karakter birlikte çalışıyor, biri diğerini ezmiyor.
    const a = applyYearCharacter(getJourneyYearColors(0, 6), { ...NOTR, intensity: 0.9 })
    const b = applyYearCharacter(getJourneyYearColors(5, 6), { ...NOTR, intensity: 0.9 })
    expect(a.from).not.toBe(b.from)
  })
})

describe('applyYearCharacter — WCAG tabanı korunuyor', () => {
  it('HER karakter kombinasyonunda accent beyaz metni taşır (≥4.5:1)', () => {
    /*
     * ⚠ Bu testin geçmişi var: paletin ilk sürümünde göz kararı seçilen
     * tonlar 1.9–2.9:1 çıkmış ve okunmamıştı. Karakter bindirmesi o
     * kazanımı bozmamalı — bu yüzden uçlar dahil taranıyor.
     */
    const kotuler: string[] = []

    for (let i = 0; i < 8; i++) {
      const base = getJourneyYearColors(i, 8)
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        for (const discovery of [0, 0.25, 0.5, 0.75, 1]) {
          const out = applyYearCharacter(base, { intensity, discovery, spread: 0.5 })
          const c = contrastWithWhite(out.accent)
          if (c < 4.5) {
            kotuler.push(`i=${i} yoğ=${intensity} keşif=${discovery} → ${c.toFixed(2)}:1`)
          }
        }
      }
    }

    expect(kotuler).toEqual([])
  })

  it('arka plan renkleri her zaman koyu kalır (metin beyaz)', () => {
    for (let i = 0; i < 8; i++) {
      const base = getJourneyYearColors(i, 8)
      const parlak = applyYearCharacter(base, { intensity: 1, discovery: 1, spread: 1 })
      // 0.35'in üstü "açık zemin" demektir; beyaz metin orada kırılır.
      expect(luminance(parlak.from)).toBeLessThan(0.35)
    }
  })

  it('geçerli hex üretir (bozuk renk sessizce yayılmasın)', () => {
    const out = applyYearCharacter(getJourneyYearColors(1, 5), {
      intensity: 0.7,
      discovery: 0.3,
      spread: 0.9,
    })
    for (const v of [out.from, out.to, out.accent]) {
      expect(v).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('characterAngle / characterFocusX', () => {
  it('dağınık yıl ile odaklı yıl farklı açıda', () => {
    expect(characterAngle(0)).not.toBe(characterAngle(1))
  })

  it('açı makul aralıkta kalır (155°–215°)', () => {
    for (const s of [0, 0.5, 1]) {
      expect(characterAngle(s)).toBeGreaterThanOrEqual(155)
      expect(characterAngle(s)).toBeLessThanOrEqual(215)
    }
  })

  it('ışık odağı keşifle birlikte kayar', () => {
    expect(characterFocusX(0)).toBeLessThan(characterFocusX(1))
    expect(characterFocusX(0.5)).toBeGreaterThanOrEqual(30)
    expect(characterFocusX(1)).toBeLessThanOrEqual(70)
  })
})
