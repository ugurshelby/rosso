import { describe, it, expect, vi } from 'vitest'

// `vertex-core` ağ/Supabase çeker; bu dosyada test edilen `validateAiSelection`
// saf bir fonksiyon, o yüzden çekirdek modül tamamen mock'lanıyor.
vi.mock('./vertex-core', () => ({
  AI_MODELS: { curation: 'gemini-2.5-flash', catalogEnrichment: 'gemini-2.5-flash' },
  callVertexJson: vi.fn(async () => null),
  aiKullanilabilir: vi.fn(() => false),
  vertexKimlikSecenekleri: vi.fn(() => null),
}))

import {
  indekslerdenIdlere,
  tanimBlogu,
  validateAiSelection,
  type AiCandidateTrack,
  type MoodCurationRequest,
  type MoodTanimi,
} from './gemini-client'

// ---------------------------------------------------------------------------
// validateAiSelection — AI ile kullanıcı arasındaki BİRİNCİ bariyer.
//
// Buradaki her kural bir GÜVENLİK kuralıdır, stil değil:
//  • Kullanıcının çıkardığı şarkı geri gelemez (Sahibin hard rule'u).
//  • AI havuzda olmayan bir id uydurursa listeye giremez.
//  • Liste TABANIN altına düşerse deterministik olarak tamamlanır — ama
//    yalnız tabana kadar, hedefe (50) kadar DEĞİL (2026-09-20 denetimi).
//
// İkinci bariyer SQL'de (`save_mood_pkg_payload`, migration 0312) — ikisi
// BİRBİRİNDEN BAĞIMSIZ olmalı; bu testler TS tarafının kendi başına doğru
// olduğunu garanti eder.
// ---------------------------------------------------------------------------

function aday(id: string): AiCandidateTrack {
  return { id, t: `title-${id}`, a: `artist-${id}`, pc: 1 }
}

const HAVUZ = ['a', 'b', 'c', 'd', 'e'].map(aday)

describe('validateAiSelection', () => {
  it('AI’ın uydurduğu (havuzda olmayan) id’leri eler', () => {
    const sonuc = validateAiSelection(['a', 'HAYALET', 'b'], HAVUZ, [], 5)
    expect(sonuc).not.toContain('HAYALET')
    expect(sonuc.slice(0, 2)).toEqual(['a', 'b'])
  })

  it('kullanıcının çıkardığı şarkıyı ASLA geri getirmez (hard rule)', () => {
    // AI açıkça 'c'yi seçse bile gizlenmişse geçemez.
    const sonuc = validateAiSelection(['a', 'c', 'b'], HAVUZ, ['c'], 5)
    expect(sonuc).not.toContain('c')
  })

  it('gizlenmiş şarkı deterministik TAMAMLAMA sırasında da geri gelmez', () => {
    // En kritik senaryo: AI hiçbir şey seçmese ve liste havuzdan doldurulsa
    // bile gizli şarkı sızmamalı.
    const sonuc = validateAiSelection([], HAVUZ, ['b', 'd'], 5)
    expect(sonuc).not.toContain('b')
    expect(sonuc).not.toContain('d')
    expect(sonuc).toEqual(['a', 'c', 'e'])
  })

  it('tekrar eden id’leri tekler', () => {
    const sonuc = validateAiSelection(['a', 'a', 'a', 'b'], HAVUZ, [], 5)
    expect(sonuc.filter((x) => x === 'a')).toHaveLength(1)
  })

  it('eksik kalan kontenjanı havuzun SKOR sırasından tamamlar', () => {
    // AI yalnız 'e' döndü; kalan 4 slot havuz sırasıyla dolmalı.
    const sonuc = validateAiSelection(['e'], HAVUZ, [], 5)
    expect(sonuc[0]).toBe('e')
    expect(sonuc).toHaveLength(5)
    expect([...sonuc].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('limiti asla aşmaz', () => {
    const sonuc = validateAiSelection(['a', 'b', 'c', 'd', 'e'], HAVUZ, [], 3)
    expect(sonuc).toHaveLength(3)
  })

  it('AI’ın sırasını korur (kürasyon kararı tamamlamadan önce gelir)', () => {
    const sonuc = validateAiSelection(['d', 'b'], HAVUZ, [], 4)
    expect(sonuc.slice(0, 2)).toEqual(['d', 'b'])
  })

  it('havuz boşsa boş döner, uydurmaz', () => {
    expect(validateAiSelection(['a', 'b'], [], [], 5)).toEqual([])
  })

  it('tüm havuz gizlenmişse boş döner (çağıran SQL fallback’ine düşer)', () => {
    const sonuc = validateAiSelection(['a', 'b'], HAVUZ, ['a', 'b', 'c', 'd', 'e'], 5)
    expect(sonuc).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 🔴 KISA LİSTE MEŞRUDUR (2026-09-20 kalite denetimi).
//
// Eski davranış: model kaç parça seçerse seçsin, liste HER ZAMAN `limit`e
// (50) tamamlanıyordu. Yani sistemde 50'den kısa bir liste üretebilen hiçbir
// yol yoktu ve modelin "burada yalnız 30 parça uyuyor" kararı sessizce iptal
// ediliyordu. ÖLÇÜLDÜ: Sahip 7 mood listesinden 350 parçanın 193'ünü
// (%55) elle çıkardı; dibi kazıyan tamamlama bunun bir bileşeni.
//
// Yeni davranış: tamamlama YALNIZ tabana kadar (ekranda boş sayfa olmasın).
// Bu testler o ayrımı kilitler — biri düşerse eski hata geri gelmiş demektir.
// ---------------------------------------------------------------------------

describe('validateAiSelection — kısa liste meşrudur', () => {
  const GENIS = Array.from({ length: 60 }, (_, i) => aday(`t${i}`))

  it('model tabandan FAZLA seçtiyse listeye hiç dokunmaz (hedefe tamamlamaz)', () => {
    const secim = GENIS.slice(0, 30).map((c) => c.id)
    const sonuc = validateAiSelection(secim, GENIS, [], 50, 25)
    expect(sonuc).toHaveLength(30)
    expect(sonuc).toEqual(secim)
  })

  it('model tabandan AZ seçtiyse yalnız tabana kadar tamamlar', () => {
    const sonuc = validateAiSelection(['t0', 't1'], GENIS, [], 50, 25)
    expect(sonuc).toHaveLength(25)
    expect(sonuc.slice(0, 2)).toEqual(['t0', 't1'])
  })

  it('taban limitten büyük verilse bile limit aşılmaz', () => {
    const sonuc = validateAiSelection(['t0'], GENIS, [], 10, 40)
    expect(sonuc).toHaveLength(10)
  })

  it('tabana tamamlarken de gizlenmiş şarkı sızmaz', () => {
    const gizli = GENIS.slice(0, 10).map((c) => c.id)
    const sonuc = validateAiSelection([], GENIS, gizli, 50, 25)
    expect(sonuc).toHaveLength(25)
    for (const id of gizli) expect(sonuc).not.toContain(id)
  })
})

// ---------------------------------------------------------------------------
// 🔴 ONAY KOTASI — AI'ın ezemediği İKİNCİ hard rule (2026-09-20).
//
// ÖLÇÜLDÜ (canlı koşum): deterministik havuzun ilk 50'si kullanıcının bıraktığı
// 157 parçanın %91'ini taşıyordu; AI kürasyonundan sonra bu oran %48'e düştü
// (`closer`da %78 → %22). Yani AI, elimizdeki tek insan etiketine göre NET
// ZARARLI çalışıyordu: kullanıcının tek tek onayladığı parçaları atıyordu.
//
// `hidden_track_ids` için hard rule zaten vardı; bu onun POZİTİF ikizi.
// Kota hedefin %70'i: liste bozulmaz ama donmaz da.
// ---------------------------------------------------------------------------

describe('validateAiSelection — onay kotası', () => {
  function onayli(id: string): AiCandidateTrack {
    return { ...aday(id), k: true }
  }

  it('AI atsa bile onaylanan parçaları listeye geri koyar', () => {
    const havuz = [onayli('o1'), onayli('o2'), aday('x1'), aday('x2'), aday('x3')]
    // AI yalnız onaysızları seçti.
    const sonuc = validateAiSelection(['x1', 'x2', 'x3'], havuz, [], 10, 1)
    expect(sonuc).toContain('o1')
    expect(sonuc).toContain('o2')
  })

  it('yer açmak gerekirse SONDAN ve yalnız ONAYSIZ parçaları atar', () => {
    const havuz = [onayli('o1'), onayli('o2'), aday('x1'), aday('x2'), aday('x3')]
    // Limit 3, AI 3 onaysız seçti; 2 onaylı için sondan 2 onaysız düşmeli.
    const sonuc = validateAiSelection(['x1', 'x2', 'x3'], havuz, [], 3, 1)
    expect(sonuc).toHaveLength(3)
    expect(sonuc[0]).toBe('x1') // AI'ın EN güvendiği seçim korunur
    expect(sonuc).toContain('o1')
    expect(sonuc).toContain('o2')
    expect(sonuc).not.toContain('x3')
  })

  it('ZORLA eklenen onay sayısı hedefin yüzde 70’iyle sınırlı — liste donmaz', () => {
    const havuz = Array.from({ length: 20 }, (_, i) => onayli(`o${i}`))
    havuz.push(...Array.from({ length: 10 }, (_, i) => aday(`x${i}`)))
    // 20 onaylı parça var ama limit 10 → kota ceil(10 × 0,7) = 7.
    // AI 10 onaysız seçtiyse yalnız 7'si düşer; 3 slot modelin kararında kalır.
    const secim = Array.from({ length: 10 }, (_, i) => `x${i}`)
    const sonuc = validateAiSelection(secim, havuz, [], 10, 1)
    expect(sonuc).toHaveLength(10)
    expect(sonuc.filter((id) => id.startsWith('o'))).toHaveLength(7)
    expect(sonuc.filter((id) => id.startsWith('x'))).toHaveLength(3)
  })

  /*
   * ⚠ Tamamlama (taban altına düşen liste) havuzun SKOR sırasını izler ve
   * onay/onaysız ayrımı YAPMAZ — bilinçli. Havuz sırası zaten SQL tarafında
   * aynı %70 kotasıyla kurulmuş durumda (migration 0326); burada ikinci kez
   * kota uygulamak iki katmanı çatıştırırdı.
   */
  it('tamamlama havuz sırasını izler, ikinci bir kota uygulamaz', () => {
    const havuz = Array.from({ length: 20 }, (_, i) => onayli(`o${i}`))
    const sonuc = validateAiSelection([], havuz, [], 10, 10)
    expect(sonuc).toHaveLength(10)
    expect(sonuc.every((id) => id.startsWith('o'))).toBe(true)
  })

  it('onaylanan bir parça sonradan GİZLENDİYSE geri gelmez (hidden üstündür)', () => {
    const havuz = [onayli('o1'), onayli('o2'), aday('x1')]
    const sonuc = validateAiSelection(['x1'], havuz, ['o1'], 10, 1)
    expect(sonuc).not.toContain('o1')
    expect(sonuc).toContain('o2')
  })

  it('onay yoksa davranış değişmez (geriye dönük uyum)', () => {
    const sonuc = validateAiSelection(['a', 'b'], HAVUZ, [], 5, 2)
    expect(sonuc).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// indekslerdenIdlere — `mood-v2-indeks`'ten beri model uuid değil sıra numarası
// döndürüyor ve uuid eşlemesi BİZDE yapılıyor. Bu fonksiyon, modelin
// çıktısının listelere dokunmadan önce geçtiği İLK kapı; `validateAiSelection`
// ikinci, SQL (`save_mood_pkg_payload`) üçüncü.
// ---------------------------------------------------------------------------

describe('indekslerdenIdlere', () => {
  it('sıra numaralarını aday uuid’lerine, modelin sırasını koruyarak çevirir', () => {
    expect(indekslerdenIdlere([3, 0, 4], HAVUZ)).toEqual(['d', 'a', 'e'])
  })

  it('aralık dışı numaraları eler (model olmayan bir adayı “seçemez”)', () => {
    expect(indekslerdenIdlere([0, 5, 99, -1, 2], HAVUZ)).toEqual(['a', 'c'])
  })

  it('tamsayı olmayan numaraları eler', () => {
    expect(indekslerdenIdlere([1.5, 1, Number.NaN], HAVUZ)).toEqual(['b'])
  })

  it('tekrarları tekler', () => {
    expect(indekslerdenIdlere([2, 2, 2, 0], HAVUZ)).toEqual(['c', 'a'])
  })

  it('hepsi geçersizse boş döner (çağıran SQL’e düşer)', () => {
    expect(indekslerdenIdlere([10, 11], HAVUZ)).toEqual([])
  })

  it('gizlenmiş şarkı eşlemede geçse bile validateAiSelection onu durdurur', () => {
    // Katmanlar birbirinden bağımsız: eşleme kural bilmez, filtre bilir.
    const ids = indekslerdenIdlere([2, 0], HAVUZ)
    expect(ids).toContain('c')
    expect(validateAiSelection(ids, HAVUZ, ['c'], 5)).not.toContain('c')
  })
})

describe('kuratorNotunuTemizle — Liner Notes doğrulaması', () => {
  it('düzgün tek cümleyi kabul eder', async () => {
    const { kuratorNotunuTemizle } = await import('./gemini-client')
    expect(kuratorNotunuTemizle('  Gece boyunca akan,  yavaş bir seçki.  ')).toBe('Gece boyunca akan, yavaş bir seçki.')
  })
  it('ünlem, rakam, kısa ve uzun metni reddeder (uydurma istatistik riski sıfır)', async () => {
    const { kuratorNotunuTemizle } = await import('./gemini-client')
    expect(kuratorNotunuTemizle('Senin için harika bir liste!')).toBeNull()
    expect(kuratorNotunuTemizle('Bu listede 40 parça var, sakin.')).toBeNull()
    expect(kuratorNotunuTemizle('kısa')).toBeNull()
    expect(kuratorNotunuTemizle('a'.repeat(141))).toBeNull()
    expect(kuratorNotunuTemizle(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// tanimBlogu — Sahibin yazılı kuralının modele ulaştığı TEK kanal.
//
// Neden test: tür ekseni deterministik katmanda yalnız SKOR (sepet dışı ×0.8,
// elenmez). Prompt'a girmezse SQL doğru seçer, AI katmanı sessizce geri bozar.
// Migration 0333 quiet_side'ın tür sepetini Sahibin cümlesinden yazdı;
// bu testler o cümlenin prompt'a kadar geldiğini kilitler.
// ---------------------------------------------------------------------------
describe('tanimBlogu — tür ekseni prompt’a giriyor', () => {
  function istek(tanim: Partial<MoodTanimi> | null): MoodCurationRequest {
    return {
      playlistTitle: 'The quiet side',
      playlistDefinition: 'tek satır',
      moodTanimi: tanim
        ? {
            kimlik: 'k',
            olmali: 'o',
            olmamali: 'x',
            energyAllow: [],
            energyIdeal: [],
            pozitif: [],
            negatif: [],
            enstrumantal: 'none',
            pozitifGenres: [],
            negatifGenres: [],
            ...tanim,
          }
        : null,
      userTasteSummary: '',
      recentListening: '',
      previousTrackIds: [],
      hiddenCount: 0,
      artistPenaltyNote: '',
      negatifOrnekler: [],
      pozitifOrnekler: [],
      metaverisizOran: 0,
      candidates: [],
      targetCount: 50,
      userId: 'u1',
    }
  }

  it('pozitif tür sepeti GENRE BASE olarak yazılır', () => {
    const p = tanimBlogu(istek({ pozitifGenres: ['rock', 'alternatif', 'hip-hop'] }))
    expect(p).toContain('GENRE BASE')
    expect(p).toContain('rock / alternatif / hip-hop')
  })

  it('negatif tür listesi ayrıca yazılır', () => {
    const p = tanimBlogu(istek({ negatifGenres: ['reggae', 'metal'] }))
    expect(p).toContain('GENRES THAT DO NOT BELONG')
    expect(p).toContain('reggae / metal')
  })

  it('sepet boşsa tür bloğu HİÇ yazılmaz — boş başlık token israfıdır', () => {
    const p = tanimBlogu(istek({}))
    expect(p).not.toContain('GENRE BASE')
    expect(p).not.toContain('GENRES THAT DO NOT BELONG')
  })

  it('tanım okunamazsa eski tek satırlık davranışa düşer, çökmez', () => {
    const p = tanimBlogu(istek(null))
    expect(p).toContain('PLAYLIST CHARACTER')
    expect(p).not.toContain('GENRE BASE')
  })
})
