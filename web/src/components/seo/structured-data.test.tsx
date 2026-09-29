import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { YaziYapisalVeri, SssYapisalVeri } from './structured-data'

/**
 * Bu testlerin varlık sebebi ölçülmüş bir hatadır (2026-08-21):
 * ilk yazımda kaçış `'<'` şeklindeydi — tek ters bölü. JavaScript
 * bunu doğrudan `<` karakterine çözüyor, yani kod `.replace(/</g, '<')`
 * oluyordu: **koruma hiçbir şey yapmıyordu.** Sahte güvenlik, korumasızlıktan
 * daha tehlikeli çünkü bakan kişi "kaçış var" diye geçiyor.
 *
 * Kaynak koda bakan bir kontrol bu hatayı yakalayamaz; yalnız DAVRANIŞ
 * ölçümü yakalar.
 */

function ciktisi(el: React.ReactElement): string {
  return renderToStaticMarkup(el)
}

describe('JSON-LD script kaçışı', () => {
  it('🔴 başlıktaki </script> bloğu ERKEN KAPATAMAZ', () => {
    const html = ciktisi(
      <YaziYapisalVeri
        baslik={'Kötü</script><img src=x onerror=alert(1)>'}
        ozet="ozet"
        tarih="2026-01-01"
        slug="test"
      />,
    )

    // Ham `</script>` çıktıda GÖRÜNMEMELİ — görünürse HTML ayrıştırıcısı
    // bloğu orada kapatır ve sonrası çalıştırılabilir gövdeye düşer.
    expect(html).not.toContain('</script><img')
    expect(html).toContain('u003c')
  })

  it('`<` ve `>` karakterleri kaçırılır', () => {
    const html = ciktisi(
      <YaziYapisalVeri baslik="a<b>c" ozet="o" tarih="2026-01-01" slug="s" />,
    )
    const govde = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'))
    expect(govde).not.toContain('<')
    expect(govde).not.toContain('>')
  })

  it('`&` kaçırılır — entity çözümü engellenir', () => {
    const html = ciktisi(
      <YaziYapisalVeri baslik="rock & roll" ozet="o" tarih="2026-01-01" slug="s" />,
    )
    expect(html).toContain('u0026')
  })

  it('kaçırma veriyi BOZMAZ — JSON hâlâ ayrıştırılabilir', () => {
    const baslik = 'Şarkı <b>&</b> "tırnak"'
    const html = ciktisi(
      <YaziYapisalVeri baslik={baslik} ozet="özet" tarih="2026-03-04" slug="deneme" />,
    )
    const ham = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'))

    const veri = JSON.parse(ham) as { headline: string; datePublished: string }
    // Kaçırılan biçim JSON standardında geçerli: okuyan taraf orijinali görür.
    expect(veri.headline).toBe(baslik)
    expect(veri.datePublished).toBe('2026-03-04')
  })

  it('SSS bloğu da aynı korumadan geçer', () => {
    const html = ciktisi(
      <SssYapisalVeri sorular={[{ q: 'Soru</script>', a: 'Cevap' }]} />,
    )
    expect(html).not.toContain('</script>C')
    expect(html).toContain('u003c')
  })

  it('geçerli JSON-LD üretir — tip ve zorunlu alanlar yerinde', () => {
    const html = ciktisi(
      <YaziYapisalVeri baslik="Normal başlık" ozet="özet" tarih="2026-05-12" slug="isrc" />,
    )
    const veri = JSON.parse(html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'))) as {
      '@type': string
      headline: string
      url: string
    }
    expect(veri['@type']).toBe('BlogPosting')
    expect(veri.headline).toBe('Normal başlık')
    expect(veri.url).toContain('/blog/isrc')
  })
})
