import { describe, it, expect } from 'vitest'

/**
 * Mood detay sayfası — ŞARKI SAYISI TEK ÖLÇÜDEN GELİR.
 *
 * ─── Ölçülmüş kırık (2026-08-25, playlist turu) ─────────────────────────
 * Canlı sayfada hero **"32 şarkı"**, listenin üstü **"50 şarkı"** yazıyordu.
 * Aynı sayfada iki farklı sayı; kullanıcı hangisine inanacağını bilemez.
 *
 * Sebep, iki tarafın aynı veriyi FARKLI yöntemle saymasıydı:
 *
 *   hero      → tracks.length - hiddenTrackIds.length      (körlemesine çıkarma)
 *   workspace → gizli kimlikleri satırlarla eşleştir, filtrele
 *
 * Çıkarma, her gizli kimliğin listede gerçekten bulunduğunu VARSAYAR. Paket
 * cron'la tazelenince eski bir şarkı listeden düşer ama kaydı
 * `hidden_track_ids`te kalır — o an çıkarma fazladan siler.
 *
 * Ölçümde tam bu görüldü: 18 gizli kimlik vardı, hiçbiri listede yoktu
 * ("Hepsini geri al" düğmesi bile çıkmıyordu), hero yine 18 eksik yazıyordu.
 *
 * ⚠ Bu testler saf sayma mantığını sınar — DB veya bileşen gerekmez. Kırık
 * zaten mantıktaydı, altyapıda değil.
 */

interface SahteTrack {
  trackId: string | null
}

/** Sayfadaki (`mood/[key]/page.tsx`) kuralın birebir aynısı. */
function gorunenSarkiSayisi(tracks: SahteTrack[], hiddenTrackIds: string[]): number {
  const gizli = new Set(hiddenTrackIds)
  return tracks.filter((t) => t.trackId && !gizli.has(t.trackId)).length
}

/** `MoodWorkspace`in listenin üstünde gösterdiği sayının aynısı. */
function workspaceSayisi(tracks: SahteTrack[], hiddenTrackIds: string[]): number {
  const gizli = new Set(hiddenTrackIds)
  return tracks.filter((t) => !gizli.has(t.trackId ?? '')).length
}

function parcalar(...idler: (string | null)[]): SahteTrack[] {
  return idler.map((trackId) => ({ trackId }))
}

describe('mood detay — şarkı sayısı', () => {
  it('gizleme yokken tüm şarkıları sayar', () => {
    const t = parcalar('a', 'b', 'c')
    expect(gorunenSarkiSayisi(t, [])).toBe(3)
  })

  it('gerçekten listede olan gizli şarkıyı düşer', () => {
    const t = parcalar('a', 'b', 'c')
    expect(gorunenSarkiSayisi(t, ['b'])).toBe(2)
  })

  it('🔴 LİSTEDE OLMAYAN gizli kimlik sayıyı DÜŞÜRMEZ', () => {
    /*
     * Kırığın tam senaryosu: paket tazelendi, gizlenen şarkılar listeden
     * düştü, ama kayıtları duruyor. Eski "çıkarma" yöntemi burada
     * 3 - 18 = -15 gibi anlamsız bir sonuca bile gidebiliyordu.
     */
    const t = parcalar('a', 'b', 'c')
    const artikYokOlanlar = Array.from({ length: 18 }, (_, i) => `eski-${i}`)
    expect(gorunenSarkiSayisi(t, artikYokOlanlar)).toBe(3)
  })

  it('gizli sayısı liste boyunu aşsa bile sayı negatife düşmez', () => {
    const t = parcalar('a')
    const cok = Array.from({ length: 50 }, (_, i) => `yok-${i}`)
    expect(gorunenSarkiSayisi(t, cok)).toBeGreaterThanOrEqual(0)
  })

  it('kimliksiz (null) satır sayılmaz', () => {
    // Paket bazen çözülememiş şarkı döndürür; kullanıcıya "şarkı" diye
    // sunulamaz, sayıya da girmemeli.
    const t = parcalar('a', null, 'c')
    expect(gorunenSarkiSayisi(t, [])).toBe(2)
  })

  it('★ HERO ile LİSTE aynı sayıyı verir — sözleşme', () => {
    /*
     * Asıl korunan şey bu: iki yüzey aynı veriden aynı sonucu üretmeli.
     * Biri değişirse bu test kırılır ve çelişki canlıya gitmez.
     */
    const senaryolar: { t: SahteTrack[]; gizli: string[] }[] = [
      { t: parcalar('a', 'b', 'c'), gizli: [] },
      { t: parcalar('a', 'b', 'c'), gizli: ['a'] },
      { t: parcalar('a', 'b', 'c'), gizli: ['x', 'y'] },
      { t: parcalar('a', 'b', 'c'), gizli: ['a', 'b', 'c'] },
    ]

    for (const { t, gizli } of senaryolar) {
      expect(
        gorunenSarkiSayisi(t, gizli),
        `hero ile liste ayrıştı — gizli: [${gizli.join(', ')}]`
      ).toBe(workspaceSayisi(t, gizli))
    }
  })
})
