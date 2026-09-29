import { describe, it, expect, vi } from 'vitest'
import {
  DeezerGeciciHata,
  baslikAnahtari,
  deezerSanatciGorseli,
  deezerSarkiKapagi,
  gecerliDeezerGorseli,
} from './deezer'

const MD5 = 'a'.repeat(32)
const KAPAK = `https://cdn-images.dzcdn.net/images/cover/${MD5}/500x500-000000-80-0-0.jpg`
const ARTIST = `https://cdn-images.dzcdn.net/images/artist/${MD5}/500x500-000000-80-0-0.jpg`
const YER_TUTUCU = 'https://cdn-images.dzcdn.net/images/cover//500x500-000000-80-0-0.jpg'

function sahteFetch(...yanitlar: Array<unknown | Error>) {
  const f = vi.fn()
  for (const y of yanitlar) {
    if (y instanceof Error) f.mockRejectedValueOnce(y)
    else f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => y })
  }
  return f as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('gecerliDeezerGorseli', () => {
  it('md5 dolu Deezer CDN kapağı geçerli', () => {
    expect(gecerliDeezerGorseli(KAPAK)).toBe(KAPAK)
    expect(gecerliDeezerGorseli(ARTIST)).toBe(ARTIST)
  })
  it('boş md5 yer tutucusu, yabancı alan adı ve http reddedilir', () => {
    expect(gecerliDeezerGorseli(YER_TUTUCU)).toBeNull()
    expect(gecerliDeezerGorseli('https://evil.example.com/images/cover/' + MD5 + '/x.jpg')).toBeNull()
    expect(gecerliDeezerGorseli(KAPAK.replace('https', 'http'))).toBeNull()
    expect(gecerliDeezerGorseli(undefined)).toBeNull()
  })
})

describe('baslikAnahtari', () => {
  it('sürüm ekleri ve parantezler atılır', () => {
    const hedef = baslikAnahtari('Let It Happen')
    expect(baslikAnahtari('Let It Happen - Remastered 2015')).toBe(hedef)
    expect(baslikAnahtari('Let It Happen (Radio Edit)')).toBe(hedef)
    expect(baslikAnahtari('LET IT HAPPEN')).toBe(hedef)
  })
  it('farklı şarkı farklı anahtar', () => {
    expect(baslikAnahtari('Let It Happen')).not.toBe(baslikAnahtari('Let It Be'))
  })
})

describe('deezerSarkiKapagi', () => {
  it('ISRC eşleşmesi kesindir', async () => {
    const f = sahteFetch({ album: { cover_big: KAPAK } })
    const r = await deezerSarkiKapagi({ isrc: 'GBUM71505078', title: 'x', artists: ['y'] }, f)
    expect(r).toEqual({ url: KAPAK, kaynak: 'isrc' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('ISRC yoksa/başarısızsa normalize başlık+sanatçı araması', async () => {
    const f = sahteFetch({
      data: [{ title: 'Let It Happen - Remastered', artist: { name: 'Tame Impala' }, album: { cover_big: KAPAK } }],
    })
    const r = await deezerSarkiKapagi({ title: 'Let It Happen', artists: ['Tame Impala'] }, f)
    expect(r).toEqual({ url: KAPAK, kaynak: 'arama' })
  })

  it('🔴 yanlış sanatçı/başlık YAKLAŞIK ALINMAZ (yanlış kapak kapaksızdan kötü)', async () => {
    const f = sahteFetch({
      data: [
        { title: 'Let It Happen', artist: { name: 'Baska Sanatci' }, album: { cover_big: KAPAK } },
        { title: 'Let It Be', artist: { name: 'Tame Impala' }, album: { cover_big: KAPAK } },
      ],
    })
    expect(await deezerSarkiKapagi({ title: 'Let It Happen', artists: ['Tame Impala'] }, f)).toBeNull()
  })

  it('yer tutucu (boş md5) kapak reddedilir', async () => {
    const f = sahteFetch({
      data: [{ title: 'A', artist: { name: 'B' }, album: { cover_big: YER_TUTUCU } }],
    })
    expect(await deezerSarkiKapagi({ title: 'A', artists: ['B'] }, f)).toBeNull()
  })

  it('Deezer "veri yok" hatası = kesin yok (null), fırlatmaz', async () => {
    const f = sahteFetch({ error: { type: 'DataException', code: 800 } }, { data: [] })
    expect(await deezerSarkiKapagi({ isrc: 'GBUM71505078', title: 'A', artists: ['B'] }, f)).toBeNull()
  })

  it('ağ hatası / kota GEÇİCİ hatadır (damga vurulmasın diye fırlatır)', async () => {
    const ag = sahteFetch(new Error('ECONNRESET'))
    await expect(deezerSarkiKapagi({ title: 'A', artists: ['B'] }, ag)).rejects.toBeInstanceOf(DeezerGeciciHata)
    const kota = sahteFetch({ error: { type: 'Exception', code: 4, message: 'Quota limit exceeded' } })
    await expect(deezerSarkiKapagi({ title: 'A', artists: ['B'] }, kota)).rejects.toBeInstanceOf(DeezerGeciciHata)
  })

  it('geçersiz ISRC biçimi sorgulanmaz', async () => {
    const f = sahteFetch({ data: [] })
    await deezerSarkiKapagi({ isrc: '../etc', title: 'A', artists: ['B'] }, f)
    expect(f.mock.calls[0]![0]).toContain('/search?')
  })
})

describe('deezerSanatciGorseli', () => {
  it('ada TAM eşleşen sanatçının görselini döner', async () => {
    const f = sahteFetch({
      data: [
        { name: 'Tame Impala Tribute', picture_big: ARTIST },
        { name: 'Tame Impala', picture_big: ARTIST },
      ],
    })
    expect(await deezerSanatciGorseli('Tame Impala', f)).toBe(ARTIST)
  })

  it('eşleşme yoksa null (ilk sonuca düşülmez)', async () => {
    const f = sahteFetch({ data: [{ name: 'Baska', picture_big: ARTIST }] })
    expect(await deezerSanatciGorseli('Tame Impala', f)).toBeNull()
  })

  it('aksan/büyük-küçük harf farkı eşleşir', async () => {
    const f = sahteFetch({ data: [{ name: 'Sezen Aksu', picture_big: ARTIST }] })
    expect(await deezerSanatciGorseli('SEZEN AKSU', f)).toBe(ARTIST)
  })
})
