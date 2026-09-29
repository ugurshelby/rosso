import { describe, it, expect } from 'vitest'

/**
 * Yön oku, kullanıcının GÖRDÜĞÜ sayıya bakar — ham orana değil.
 *
 * ─── Ölçülmüş kırık (2026-08-25, journey turu) ──────────────────────────
 * 2023 keşif kartında yan yana şunlar duruyordu:
 *
 *     56%
 *     ↓ geçen yıl 56%
 *
 * Ham oranlar gerçekten farklıydı (0,5649 ↔ 0,5551) ama ikisi de ekranda
 * %56'ya yuvarlanıyordu. Kullanıcı, aynı iki sayı arasında bir "düşüş"
 * oku görüyordu — veri doğru, sunum yanlış.
 *
 * ⚠ Bu kırığı hiçbir otomatik kontrol yakalayamaz: tip doğru, hesap doğru,
 * bileşen doğru render ediyor. Yalnız KAREYE BAKINCA görülür
 * (`kural-frontend-akisi.md` §1 adım 5'in varlık sebebi).
 */

/** `journey-view.tsx`teki `pct` ile birebir aynı. */
function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

/** Kartın gösterdiği delta metnini üretir (bileşendeki kuralın aynısı). */
function deltaMetni(simdiHam: number, oncekiHam: number): string {
  const simdi = pct(simdiHam)
  const onceki = pct(oncekiHam)
  if (simdi === onceki) return `geçen yılla aynı — ${onceki}`
  return `${simdiHam < oncekiHam ? '↓' : '↑'} geçen yıl ${onceki}`
}

describe('journey delta oku', () => {
  it('🔴 yuvarlanınca EŞİTLEŞEN değerlerde ok gösterilmez', () => {
    // Ölçülen gerçek senaryo: 0,5649 ve 0,5551 → ikisi de %56.
    const metin = deltaMetni(0.5649, 0.5551)
    expect(metin).not.toContain('↓')
    expect(metin).not.toContain('↑')
    expect(metin).toContain('aynı')
  })

  it('gerçek düşüşte ↓ gösterir', () => {
    expect(deltaMetni(0.42, 0.56)).toBe('↓ geçen yıl 56%')
  })

  it('gerçek artışta ↑ gösterir', () => {
    expect(deltaMetni(0.71, 0.56)).toBe('↑ geçen yıl 56%')
  })

  it('birebir aynı oranda da "aynı" der', () => {
    expect(deltaMetni(0.5, 0.5)).toContain('aynı')
  })

  it('★ ok gösterildiğinde iki sayı EKRANDA da farklı olmalı — sözleşme', () => {
    /*
     * Korunan asıl kural: kullanıcı bir ok görüyorsa, karşılaştırdığı iki
     * sayının ekranda da farklı olması gerekir. Aksi hâli anlamsızdır.
     */
    const ornekler: [number, number][] = [
      [0.5649, 0.5551], // yuvarlanınca eşit
      [0.42, 0.56],
      [0.71, 0.56],
      [0.999, 0.994], // %100 ↔ %99
      [0.004, 0.0049], // ikisi de %0
    ]

    for (const [simdi, onceki] of ornekler) {
      const metin = deltaMetni(simdi, onceki)
      const okVar = metin.includes('↓') || metin.includes('↑')
      if (okVar) {
        expect(
          pct(simdi),
          `ok var ama ekrandaki iki sayı aynı: ${pct(simdi)} / ${pct(onceki)}`
        ).not.toBe(pct(onceki))
      }
    }
  })
})
