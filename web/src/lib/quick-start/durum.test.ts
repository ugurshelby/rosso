import { describe, it, expect } from 'vitest'
import { guvenliQuickStart, hesaplaQuickStart, type QuickStartHam, type YetenekHaritasi } from './durum'
import { KILIT_KATALOGU } from './kilit-katalogu'

const ham = (o: Partial<QuickStartHam> = {}): QuickStartHam => ({
  spotify: false,
  streaming: false,
  account: false,
  technical: false,
  yukleniyor: false,
  sonZipAt: null,
  ...o,
})

/** Faz 1: hiçbir yetenek açık değil. */
const faz1 = Object.fromEntries(KILIT_KATALOGU.map((k) => [k.yetenek, false])) as unknown as YetenekHaritasi
const acik = (...yetenekler: string[]): YetenekHaritasi =>
  ({ ...faz1, ...Object.fromEntries(yetenekler.map((a) => [a, true])) }) as YetenekHaritasi

const tumuTamam = () => ham({ spotify: true, streaming: true, account: true, technical: true })

describe('Quick Start — sıfırdan açılan hesap', () => {
  const d = hesaplaQuickStart(ham(), faz1, new Set())

  it('iki kart da görünür, sabit sırayla', () => {
    expect(d.gorunurKartlar).toEqual(['spotify', 'zip'])
    expect(d.bolumGorunur).toBe(true)
    expect(d.tamamlandi).toBe(false)
    expect(d.bolumCozulsun).toBe(false)
    expect(d.donusYolu).toBe('/dashboard')
  })

  it('ZIP ilerlemesi 0/3, üç tür de eksik', () => {
    expect(d.zip.tamamlanan).toBe(0)
    expect(d.zip.eksik).toEqual(['streaming', 'account', 'technical'])
  })

  it('tüm kilitler kapalı ve animasyon beklemiyor', () => {
    expect(d.kilitler).toHaveLength(KILIT_KATALOGU.length)
    expect(d.kilitler.every((k) => !k.acik && !k.animasyonBekliyor)).toBe(true)
  })
})

describe('Quick Start — kart çözülmesi', () => {
  it('spotify tamam ama animasyon oynamadı → kart görünür + animasyonBekliyor', () => {
    const d = hesaplaQuickStart(ham({ spotify: true }), faz1, new Set())
    const p = d.adimlar.find((a) => a.adim === 'spotify')!
    expect(p).toMatchObject({ tamam: true, animasyonBekliyor: true, gorunur: true })
    expect(d.gorunurKartlar).toContain('spotify')
  })

  it('spotify tamam ve animasyon oynadı → kart HİÇ render edilmez', () => {
    const d = hesaplaQuickStart(ham({ spotify: true }), faz1, new Set(['qs:spotify']))
    expect(d.gorunurKartlar).toEqual(['zip'])
  })

  it('ZIP kartı üç dosya gelene dek kalkmaz (2/3 → hâlâ görünür, çözülmez)', () => {
    const d = hesaplaQuickStart(ham({ streaming: true, account: true }), faz1, new Set())
    const z = d.adimlar.find((a) => a.adim === 'zip')!
    expect(z).toMatchObject({ tamam: false, animasyonBekliyor: false, gorunur: true })
    expect(d.zip.tamamlanan).toBe(2)
    expect(d.zip.eksik).toEqual(['technical'])
  })

  it('son kart tamamlanınca bölüm kartla BİRLİKTE çözülür', () => {
    const d = hesaplaQuickStart(tumuTamam(), acik('canSeePlaylists'), new Set(['qs:spotify']))
    expect(d.gorunurKartlar).toEqual(['zip'])
    expect(d.tamamlandi).toBe(true)
    expect(d.bolumCozulsun).toBe(true)
  })

  it('hepsi tamam ve görülmüşse bölüm hiç çıkmaz', () => {
    const d = hesaplaQuickStart(tumuTamam(), faz1, new Set(['qs:spotify', 'qs:zip']))
    expect(d.bolumGorunur).toBe(false)
    expect(d.gorunurKartlar).toEqual([])
    expect(d.donusYolu).toBeNull()
  })

  it('ara adımlar çözülürken bölüm çözülmez (zip hâlâ eksik)', () => {
    const d = hesaplaQuickStart(ham({ spotify: true }), faz1, new Set())
    expect(d.bolumCozulsun).toBe(false)
    expect(d.gorunurKartlar).toEqual(['spotify', 'zip'])
  })
})

describe('Faz kilidi açılış animasyonu', () => {
  it('kilit açık ve görülmemişse animasyonBekliyor', () => {
    const d = hesaplaQuickStart(ham({ spotify: true }), acik('canSeePlaylists'), new Set())
    expect(d.kilitler.find((x) => x.ozellik === 'playlists')).toMatchObject({ acik: true, animasyonBekliyor: true })
  })

  it('görüldükten sonra tekrar beklemez', () => {
    const d = hesaplaQuickStart(ham({ spotify: true }), acik('canSeePlaylists'), new Set(['kilit:playlists']))
    expect(d.kilitler.find((x) => x.ozellik === 'playlists')).toMatchObject({ acik: true, animasyonBekliyor: false })
  })

  it('kilitli özellik ne eksik olduğunu söyler (Faz 4: iki ZIP)', () => {
    const d = hesaplaQuickStart(ham({ streaming: true, account: true }), acik('canSeeRecap'), new Set())
    const b = d.kilitler.find((x) => x.ozellik === 'begeniler')!
    expect(b.acik).toBe(false)
    expect(b.acanAdim).toBe('zip')
    expect(b.eksikZipler).toEqual(['technical'])
  })
})

describe('okunamayan durum — güvenli hâl', () => {
  it('Quick Start yok, animasyon yok, kilitler faz yeteneğinden', () => {
    const d = guvenliQuickStart(acik('canSeeRecap'))
    expect(d.kaynak).toBe('hata')
    expect(d.bolumGorunur).toBe(false)
    expect(d.gorunurKartlar).toEqual([])
    expect(d.kilitler.every((k) => !k.animasyonBekliyor)).toBe(true)
    expect(d.kilitler.find((k) => k.ozellik === 'recap')!.acik).toBe(true)
    expect(d.kilitler.find((k) => k.ozellik === 'journey')!.acik).toBe(false)
  })
})
