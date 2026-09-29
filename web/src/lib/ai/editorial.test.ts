import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))
vi.mock('./vertex-core', () => ({
  AI_MODELS: { curation: 'gemini-2.5-flash', catalogEnrichment: 'gemini-2.5-flash', finale: 'gemini-2.5-pro' },
  aiKullanilabilir: vi.fn(() => false),
  callVertexJson: vi.fn(),
}))

import { karakterKelimeleri, kisaMetin, recapGirdisi, runEditorial, sayilarGirdideVar } from './editorial'
import { etiketleriSec } from './editorial-recap'
import { etiketSlug, havuzHazirMi, havuzuTemizle, KATEGORI_ASGARI, type EtiketSatiri } from './editorial-havuz'
import { finaleGirdisi, gozlemler, hikayeOlguyaAit, journeyGirdisi, kapanisiDogrula } from './editorial-journey'
import { yuzdeBicimi } from './editorial-taste'

describe('sayilarGirdideVar — uydurma sayı yasağı', () => {
  const girdi = JSON.stringify({ artist_hours: 6.6, minutes: 4160, discovery_pct: 23, hours: 1311 })

  it('girdide bulunan sayılar geçer', () => {
    expect(sayilarGirdideVar('Mavi took 6.6 hours of a 4160-minute month.', girdi)).toBe(true)
  })
  it('girdide olmayan (modelin hesapladığı) sayı reddedilir', () => {
    expect(sayilarGirdideVar('Nearly 7 hours of Mavi.', girdi)).toBe(false)
    expect(sayilarGirdideVar('Mavi took 6.7 hours.', girdi)).toBe(false)
  })
  it('sayısız metin geçer', () => {
    expect(sayilarGirdideVar('A quiet, nocturnal month.', girdi)).toBe(true)
  })
  it('ondalık virgülü noktaya, binlik ayracı düz sayıya normalleşir', () => {
    expect(sayilarGirdideVar('6,6 hours', girdi)).toBe(true)
    expect(sayilarGirdideVar('1.311 saat', girdi)).toBe(true)
    expect(sayilarGirdideVar('1,311 hours', girdi)).toBe(true)
  })
})

describe('kisaMetin', () => {
  it('boşlukları toplar, ünlem ve aşırı uzunluğu reddeder', () => {
    expect(kisaMetin('  a   quiet\nmonth ', 50)).toBe('a quiet month')
    expect(kisaMetin('What a month!', 50)).toBeNull()
    expect(kisaMetin('x'.repeat(51), 50)).toBeNull()
    expect(kisaMetin('ab', 50)).toBeNull()
    expect(kisaMetin(undefined, 50)).toBeNull()
  })
})

describe('karakterKelimeleri', () => {
  it('üç benzersiz kısa kelime alır', () => {
    expect(karakterKelimeleri(['Night Owl', 'Monolithic', 'Dystopian', 'Extra'])).toEqual([
      'Night Owl',
      'Monolithic',
      'Dystopian',
    ])
  })
  it('tekrar/uzun/ünlemli öğeler elenince üç kalmıyorsa null döner', () => {
    expect(karakterKelimeleri(['Night Owl', 'night owl', 'Dystopian'])).toBeNull()
    expect(karakterKelimeleri(['a'.repeat(30), 'Wow!', 'Calm'])).toBeNull()
    expect(karakterKelimeleri([])).toBeNull()
  })
})

describe('recapGirdisi', () => {
  it('görsel URL ve fazlalık alanları düşürür, sayıları korur', () => {
    const girdi = recapGirdisi({
      period_type: 'month',
      period_label: 'August 2026',
      period_start: '2026-08-01',
      payload: {
        manifesto: { minutes: 4160, tracks: 408, artists: 193, dominant_genre: 'pop' },
        top_artists: [{ name: 'Mavi', plays: 129, image_url: 'https://x/y.jpg' }],
        top_tracks: [{ title: 'Los Angeles', artist: 'The Midnight', plays: 16, image_url: 'https://x/z.jpg' }],
        streak: { days: 16, start: '2026-08-01', end: '2026-08-16' },
        extras: { number_one: { artist_name: 'Mavi', artist_hours: 6.6 } },
      },
    })
    expect(JSON.stringify(girdi)).not.toContain('https://')
    expect(girdi).toMatchObject({ minutes: 4160, longest_streak_days: 16, number_one_artist: { name: 'Mavi', hours: 6.6 } })
  })
  it('boş payload çökmez', () => {
    expect(() =>
      recapGirdisi({ period_type: 'month', period_label: 'X', period_start: '2026-01-01', payload: null }),
    ).not.toThrow()
  })
})

// ── Etiket havuzu ───────────────────────────────────────────────────────────

const havuz: EtiketSatiri[] = [
  { slug: 'hip-hop', category: 'genre', label_en: 'Hip-Hop', label_tr: 'Hip-Hop' },
  { slug: 'pop', category: 'genre', label_en: 'Pop', label_tr: 'Pop' },
  { slug: 'hazy', category: 'mood', label_en: 'Hazy', label_tr: 'Puslu' },
  { slug: 'driving', category: 'tempo', label_en: 'Driving', label_tr: 'İleri Giden' },
  { slug: 'night-owl', category: 'character', label_en: 'Night Owl', label_tr: 'Gece Kuşu' },
  { slug: 'fresh-start', category: 'period', label_en: 'Fresh Start', label_tr: 'Yeni Başlangıç' },
]

describe('etiketSlug', () => {
  it('kararlı ASCII slug üretir', () => {
    expect(etiketSlug('Boom Bap')).toBe('boom-bap')
    expect(etiketSlug('Drum & Bass')).toBe('drum-and-bass')
    expect(etiketSlug('Café Mood')).toBe('cafe-mood')
    expect(etiketSlug('  Lo-Fi  ')).toBe('lo-fi')
  })
})

describe('havuzuTemizle', () => {
  it('uzunluk, ünlem, rakam, "The", tekrar ve tekrarlı Türkçe etiketi eler', () => {
    const temiz = havuzuTemizle('mood', [
      { en: 'Hazy', tr: 'Puslu' },
      { en: 'Hazy', tr: 'Bulanık' }, // aynı slug
      { en: 'Gritty', tr: 'Puslu' }, // aynı Türkçe
      { en: 'The Dreamer', tr: 'Hayalci' }, // artikel
      { en: 'Wow!', tr: 'Vay' },
      { en: 'Top 40', tr: 'Liste' }, // rakam
      { en: 'a', tr: 'b' },
      { en: 'Defiant', tr: 'Meydan Okuyan' },
    ])
    expect(temiz.map((t) => t.slug)).toEqual(['hazy', 'defiant'])
  })
  it('mevcut slug ve Türkçe etiketleri tekrarlamaz', () => {
    const temiz = havuzuTemizle('mood', [{ en: 'Hazy', tr: 'Puslu' }, { en: 'Calm', tr: 'Sakin' }], new Set(['hazy']), [])
    expect(temiz.map((t) => t.slug)).toEqual(['calm'])
    const trAyni = havuzuTemizle('mood', [{ en: 'Calm', tr: 'Sakin' }], new Set(), ['sakin'])
    expect(trAyni).toEqual([])
  })
})

describe('havuzHazirMi', () => {
  it('her kategori asgariyi geçmedikçe hazır sayılmaz', () => {
    expect(havuzHazirMi(havuz)).toBe(false)
    const dolu: EtiketSatiri[] = (['genre', 'mood', 'tempo', 'character', 'period'] as const).flatMap((c) =>
      Array.from({ length: KATEGORI_ASGARI }, (_, i) => ({ slug: `${c}-${i}`, category: c, label_en: 'x', label_tr: 'y' })),
    )
    expect(havuzHazirMi(dolu)).toBe(true)
  })
})

describe('etiketleriSec — indeks eşlemesi', () => {
  it('kategori başına bir etiket alır, kategori sırasıyla dizer', () => {
    // 5 = period, 3 = tempo, 0 = genre, 1 = genre (kategori tekrarı → elenir), 2 = mood
    expect(etiketleriSec([5, 3, 0, 1, 2], havuz)).toEqual(['hip-hop', 'hazy', 'driving', 'fresh-start'])
  })
  it('aralık dışı, ondalık ve tekrar eden indeksleri eler', () => {
    expect(etiketleriSec([99, -1, 1.5, 0, 0, 2, 3], havuz)).toEqual(['hip-hop', 'hazy', 'driving'])
  })
  it('üçten az geçerli etiketle null döner (kapakta tek tük etiket yok)', () => {
    expect(etiketleriSec([0, 2], havuz)).toBeNull()
    expect(etiketleriSec([], havuz)).toBeNull()
  })
})

// ── Journey ─────────────────────────────────────────────────────────────────

describe('journeyGirdisi', () => {
  it('yıla göre sıralar; oranlar tam yüzde, dakika saat; gerçek olgular eklenir', () => {
    const girdi = journeyGirdisi(
      [
        { year: 2021, payload: { discovery_rate: 0.234, genre_label: 'pop', total_minutes: 600 } },
        { year: 2020, payload: { discovery_rate: 0.95, genre_label: 'hip-hop', total_minutes: 120 } },
      ],
      [{ year: 2020, night_pct: 11, peak_hour: 14, pillar: { title: 'P', artist: 'A', plays: 86, active_months: 11 } }],
    )
    expect(girdi.map((g) => g.year)).toEqual([2020, 2021])
    expect(girdi[0]).toMatchObject({ discovery_pct: 95, hours: 2, night_pct: 11, peak_time: '14:00' })
    expect(girdi[0]!.pillar).toMatchObject({ title: 'P', plays: 86 })
    expect(girdi[1]).toMatchObject({ discovery_pct: 23, hours: 10 })
    expect(girdi[1]!.night_pct).toBeUndefined()
  })
  it('sahte latent yoksa gece/saat alanları HİÇ yoktur', () => {
    const girdi = journeyGirdisi([{ year: 2020, payload: { total_minutes: 60 } }])
    expect(girdi[0]).not.toHaveProperty('peak_time', expect.anything())
    expect(girdi[0]!.night_pct).toBeUndefined()
  })
})

describe('hikayeOlguyaAit — parça adı yer değiştirmesi', () => {
  it('kendi parçasını anan satır geçer', () => {
    expect(hikayeOlguyaAit('"Bulutlarda" was played 35 times.', 'Bulutlarda', 'Öpünce geçer mi')).toBe(true)
  })
  it('başka olgunun parçasını yazan satır reddedilir (ölçülen hata)', () => {
    expect(hikayeOlguyaAit('Aspova\'s "Öpünce geçer mi" surged with 35 plays.', 'Bulutlarda', 'Öpünce geçer mi')).toBe(false)
  })
  it('kendi adını hiç anmayan satır reddedilir; büyük/küçük harf ve aksan yok sayılır', () => {
    expect(hikayeOlguyaAit('A song took over for weeks.', 'Bulutlarda', undefined)).toBe(false)
    expect(hikayeOlguyaAit('"OPUNCE GECER MI" stayed', 'Öpünce geçer mi', undefined)).toBe(true)
  })
})

describe('gozlemler / finaleGirdisi', () => {
  const yillar = [
    { year: 2020, payload: { total_minutes: 6000, discovery_rate: 0.95, top_track_title: 'A', top_track_artist: 'X' } },
    { year: 2023, payload: { total_minutes: 78000, discovery_rate: 0.56, top_track_title: 'B', top_track_artist: 'Y' } },
    { year: 2026, payload: { total_minutes: 2000, discovery_rate: 0.25, top_track_title: 'C', top_track_artist: 'Z' } },
  ]
  const arc = {
    first_track: { title: 'New Rules', artist: 'Dua Lipa', played_at: '2017-11-03T14:07:52+00:00' },
    last_track: { title: 'Speak of the Devil', artist: 'Black Pistol Fire' },
    biggest_shift: { from: 'Hip-Hop', to: 'Pop', year: '2025' },
    eras: [{ label: 'Hip-Hop', start_year: 2019, end_year: 2024, obsession: { title: 'Olman Gerekli', artist: 'Chef Bi', plays: 264 } }],
  }
  const olgular = [
    { year: 2020, night_pct: 11, peak_hour: 14, pillar: { title: 'P1', artist: 'A1', plays: 86, active_months: 12 } },
    { year: 2023, night_pct: 10, peak_hour: 17, pillar: { title: 'P2', artist: 'A2', plays: 137, active_months: 12 } },
    { year: 2026, night_pct: 6, peak_hour: 9 },
  ]

  it('veriden doğrulanabilir gözlemler çıkarır', () => {
    const g = gozlemler(yillar, arc, olgular)
    const metin = g.join(' ')
    expect(metin).toContain('It started in 2017 with "New Rules" by Dua Lipa.')
    expect(metin).toContain('Hip-Hop led their listening from 2019 to 2024')
    expect(metin).toContain('from Hip-Hop to Pop in 2025')
    expect(metin).toContain('95%')
    expect(metin).toContain('Their fullest year of listening was 2023: 1300 hours.')
    expect(metin).toContain('5%') // gece payı düşüşü 11% → 6%
    expect(metin).toContain('from 14:00 in 2020 to 09:00 in 2026')
    expect(metin).toContain('"P2" by A2 in 2023 (137 plays)')
    expect(metin).toContain('"Speak of the Devil" by Black Pistol Fire')
  })
  it('paket gözlemleri ve ham destek alanlarını taşır; araba oturumu yok (şarkı sayısı sanılıyordu)', () => {
    const p = finaleGirdisi(yillar, { ...arc, car: { hours: 18.4, sessions: 114 } }, olgular)
    expect(p.observations).toBeInstanceOf(Array)
    expect(p).not.toHaveProperty('car')
    expect(p).toHaveProperty('first_listen')
  })
  it('kayma/keşif düşüşü olmayan veride ilgili gözlem üretilmez', () => {
    const g = gozlemler([{ year: 2020, payload: { total_minutes: 600, discovery_rate: 0.5 } }], null, [])
    expect(g.join(' ')).not.toContain('Exploring gave way')
  })
})

describe('kapanisiDogrula', () => {
  const girdi = JSON.stringify({ a: 'New Rules', y: 2017, n: 95, m: 2025, o: 2023 })
  const iyi = {
    paragraphs: [
      "Her şey 2017'de New Rules ile başladı; kulaklıktan çıkan ilk şarkı buydu ve sonrasında yıllarca yeni sanatçılar geldi, bir kapı açıldı ve kimse kapatmadı.",
      "Sonra yeni sesler geldi, dinlediğin sanatçıların yüzde 95'i yeniydi, ve liste her hafta biraz daha genişledi; o dönemde merak, alışkanlığın önünde yürüyordu.",
      "Bazı şarkılar hep kaldı; 2023 boyunca her ay aynı parçaya döndün, bunu sen de fark etmemiş olabilirsin, çünkü tekrar ettiğin şey artık şarkıdan çok bir huydu.",
    ],
    last_line: 'Artık müzik sabah dokuzda başlıyor.',
  }
  it('iyi metni kabul eder', () => {
    expect(kapanisiDogrula(iyi, girdi)).not.toBeNull()
  })
  it('ünlem, ikinci soru, yasak sözcük ve klişeyi reddeder', () => {
    expect(kapanisiDogrula({ ...iyi, last_line: 'Harika bir yolculuk oldu bu!' }, girdi)).toBeNull()
    expect(kapanisiDogrula({ ...iyi, last_line: 'Bu yolculuk sürüyor artık burada.' }, girdi)).toBeNull()
    expect(kapanisiDogrula({ ...iyi, last_line: 'Bugünlerde fonda başka bir şarkı çalıyor.' }, girdi)).toBeNull()
    expect(kapanisiDogrula({ ...iyi, last_line: 'Bir şarkı sana eşlik etmeye devam ediyor.' }, girdi)).toBeNull()
    expect(kapanisiDogrula({ ...iyi, paragraphs: [iyi.paragraphs[0]!.replace('yıllarca', 'nasıl?'), 'Bu bir sorudur, değil mi? Evet öyle olsa gerek ki.', iyi.paragraphs[2]!] }, girdi)).toBeNull()
  })
  it('girdide olmayan sayıyı reddeder', () => {
    expect(kapanisiDogrula({ ...iyi, last_line: 'Bugüne kadar 4242 saat dinledin sen.' }, girdi)).toBeNull()
  })
  it('çok sayı içeren istatistik dökümünü reddeder', () => {
    const cok = JSON.stringify({ s: [2017, 2018, 2019, 2020, 2021, 2022, 2023] })
    const dokum = { ...iyi, last_line: 'Yıllar: 2017 2018 2019 2020 2021 2022 içinde geçti.' }
    expect(kapanisiDogrula(dokum, cok)).toBeNull()
  })
  it('kısa ve az paragraflı metni reddeder', () => {
    expect(kapanisiDogrula({ paragraphs: ['Tek paragraf yeterli değil bu yüzden reddedilmeli, ne yazık ki.'], last_line: 'Kısa bir kapanış cümlesi.' }, girdi)).toBeNull()
  })
})

describe('yuzdeBicimi', () => {
  it('İngilizcede 81%, Türkçede %81', () => {
    expect(yuzdeBicimi('a high %81 shuffle and %57 mainstream', 'en')).toBe('a high 81% shuffle and 57% mainstream')
    expect(yuzdeBicimi("Şarkıların 58% kadarı, 8 % civarı", 'tr')).toBe("Şarkıların %58 kadarı, %8 civarı")
    expect(yuzdeBicimi('zaten %58', 'tr')).toBe('zaten %58')
  })
})

describe('runEditorial', () => {
  it('AI kapalıyken DB’ye dokunmadan disabled döner', async () => {
    const r = await runEditorial(['u1'])
    expect(r).toEqual({ outcome: 'disabled', yazilan: {}, skipped: 0, errors: 0 })
  })
})
