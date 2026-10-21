import { describe, it, expect } from 'vitest'
import { SOZLUK } from './sozluk'
import { MODUL_ICERIGI, MODUL_MERKEZI } from './moduller'
import { DILLER } from './dil'
import { yazilar } from '@/app/(marketing)/blog/posts'

/**
 * Pazarlama metni kuralları (2026-10-13).
 *
 * 1. Kayıt YALNIZ davetle (migration 0359; AGENTS.md §1). Açık kayıt vaat eden
 *    bir cümle ("ücretsiz başla", "start free", "sign up for free") ziyaretçiyi
 *    kapalı bir kapıya yollar ve inceleyici akışında hata gibi görünür.
 * 2. Ürün dili hikâyedir, analiz değil (`docs/vision/uygulamali-vizyon.md`
 *    "Ürün dili"; `gerilimler.md` kelime listesi): "DNA" ve "analiz" görünür
 *    metinde geçmez.
 *
 * `anahtarKelimeler` bilerek DIŞARIDA: orası insanların aradığı kelimelerdir
 * ("spotify müzik zevki analizi"), ekranda görünmez, yalnız meta/JSON-LD'ye gider.
 */

const ACIK_KAYIT =
  /ücretsiz\s+(kayıt|başla|keşfet|playlist)|start\s+(for\s+)?free|sign\s+up\s+(for\s+)?(free|rosso\s+for\s+free)|free\s+start|\bfor\s+free\b/i
const JARGON = /\bDNA\b|DNA’|analiz|analysis|analyz/i

function metinleriTopla(deger: unknown, cikti: string[] = []): string[] {
  if (typeof deger === 'string') cikti.push(deger)
  else if (Array.isArray(deger)) for (const d of deger) metinleriTopla(d, cikti)
  else if (deger && typeof deger === 'object') {
    for (const d of Object.values(deger as Record<string, unknown>)) metinleriTopla(d, cikti)
  }
  return cikti
}

function gorunenMetinler(dil: (typeof DILLER)[number]): Array<[string, string]> {
  const kaynaklar: Array<[string, unknown]> = [['sozluk', SOZLUK[dil]]]
  for (const [anahtar, icerik] of Object.entries(MODUL_ICERIGI[dil])) {
    kaynaklar.push([`modül/${anahtar}`, { ...icerik, anahtarKelimeler: [] }])
  }
  kaynaklar.push(['modül merkezi', MODUL_MERKEZI[dil]])
  for (const yazi of yazilar(dil)) kaynaklar.push([`blog/${yazi.slug}`, yazi])
  return kaynaklar.flatMap(([ad, deger]) => metinleriTopla(deger).map((m): [string, string] => [ad, m]))
}

describe('pazarlama metni kuralları', () => {
  for (const dil of DILLER) {
    const metinler = gorunenMetinler(dil)

    it(`${dil}: metin kümesi boş değil (kural gerçekten bir şey tarıyor)`, () => {
      expect(metinler.length).toBeGreaterThan(100)
    })

    it(`${dil}: açık kayıt vaadi yok (kayıt yalnız davetle)`, () => {
      const ihlal = metinler.filter(([, m]) => ACIK_KAYIT.test(m)).map(([ad, m]) => `${ad}: ${m.slice(0, 80)}`)
      expect(ihlal).toEqual([])
    })

    it(`${dil}: görünür metinde "DNA" / "analiz" yok`, () => {
      const ihlal = metinler.filter(([, m]) => JARGON.test(m)).map(([ad, m]) => `${ad}: ${m.slice(0, 80)}`)
      expect(ihlal).toEqual([])
    })
  }
})
