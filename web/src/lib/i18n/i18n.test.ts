import { describe, it, expect } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, intlLocale, isLocale, localeFromAcceptLanguage } from './locales'
import { catalogs } from './messages'
import { createTranslator } from './full'
import { createTranslatorFrom, interpolate, yerTutucular } from './translate'
import { formatDate, formatNumber, formatRelative } from './format'

/** Bir sözlüğün tüm yapraklarını `yol → değer` olarak düzleştirir. */
function duzlestir(nesne: unknown, onek = ''): Record<string, string> {
  const cikti: Record<string, string> = {}
  if (typeof nesne === 'string') {
    cikti[onek] = nesne
    return cikti
  }
  if (nesne && typeof nesne === 'object') {
    for (const [k, v] of Object.entries(nesne)) {
      Object.assign(cikti, duzlestir(v, onek ? `${onek}.${k}` : k))
    }
  }
  return cikti
}

describe('sözlük eşitliği — "her şeyin Türkçesi var"', () => {
  const en = duzlestir(catalogs.en)
  const tr = duzlestir(catalogs.tr)

  it('Türkçe ve İngilizce AYNI anahtarlara sahip (tsc zaten zorlar; bu çalışma zamanı kanıtı)', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort())
  })

  it('hiçbir çeviri boş değil', () => {
    for (const [anahtar, metin] of [...Object.entries(en), ...Object.entries(tr)]) {
      expect(metin.trim().length, anahtar).toBeGreaterThan(0)
    }
  })

  it('her anahtarda İngilizce ve Türkçe AYNI yer tutucuları taşır', () => {
    for (const anahtar of Object.keys(en)) {
      expect(yerTutucular(tr[anahtar] ?? ''), anahtar).toEqual(yerTutucular(en[anahtar] ?? ''))
    }
  })

  it('Türkçe metin İngilizce ile birebir aynı DEĞİL (çevrilmemiş kopya yakalanır) — marka/ürün terimleri hariç', () => {
    // Bilinçle aynı kalanlar: ürün terimleri, dil adları, "Spotify" marka terimi,
    // yalnız sayı/ayraç içeren şablonlar ve Spotify'ın kendi (yalnız İngilizce)
    // Geliştirici Konsolu'nun alan adlarını birebir aynala eden BYOC mock ekranı
    // (kullanıcı gerçek Spotify sayfasında gördüğüyle eşleşmeli, çevrilirse şaşırtır).
    const istisna = new Set([
      'nav.journey', 'nav.recap', 'nav.taste',
      'common.language.en', 'common.language.tr',
      'playlists.likedView.pageInfo',
      'settings.platformConnections.labels.spotify',
      'automations.autoPlaylistRule.platformLabel.spotify',
      'data.byoc.redirectUrisField',
      'data.byoc.metaClientId',
      'data.byoc.windowTitle',
      'data.byoc.windowBreadcrumb',
      'data.byoc.createApp',
      'data.byoc.mockAppName',
      'data.byoc.mockAppNameValue',
      'data.byoc.mockAppDesc',
      'data.byoc.mockApiField',
      'data.byoc.mockApiValue',
      'data.byoc.settingsPage',
      'data.byoc.clientId',
      'data.byoc.clientSecret',
    ])
    for (const anahtar of Object.keys(en)) {
      if (istisna.has(anahtar)) continue
      expect(tr[anahtar], anahtar).not.toBe(en[anahtar])
    }
  })
})

describe('çevirici', () => {
  it('düz metin ve yer tutucu', () => {
    const { t } = createTranslator('en')
    expect(t('quickStart.title')).toBe('Quick start')
    expect(t('quickStart.cards.zip.nextUp', { missing: 'Account Data' })).toBe('Next: Account Data')
    expect(createTranslator('tr').t('quickStart.title')).toBe('Hızlı başlangıç')
  })

  it('verilmeyen yer tutucu olduğu gibi kalır (yanlış metin uydurulmaz)', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
    expect(interpolate('Hello {name}', { name: 'Ada' })).toBe('Hello Ada')
  })

  it('çoğul: İngilizce tekil/çoğul, sayı dile göre biçimlenir', () => {
    const en = createTranslator('en')
    expect(en.tp('quickStart.cards.zip.progress', 2)).toBe('2 of 3 files uploaded')
    expect(createTranslator('tr').tp('quickStart.cards.zip.progress', 1)).toBe('3 dosyadan 1 tanesi yüklendi')
  })

  it('eksik anahtar İngilizce yedeğe, o da yoksa anahtarın kendisine düşer — patlamaz', () => {
    const t = createTranslatorFrom('tr', {}, { common: catalogs.en.common })
    expect(t.t('common.loading')).toBe('Loading…')
    // @ts-expect-error — bilerek var olmayan anahtar
    expect(t.t('yok.boyle.anahtar')).toBe('yok.boyle.anahtar')
  })

  it('istemciye yalnız seçili yüzey gönderilse de o yüzeyin anahtarları çalışır', () => {
    const t = createTranslatorFrom('tr', { nav: catalogs.tr.nav })
    expect(t.t('nav.settings')).toBe('Ayarlar')
  })
})

describe('dil çözümleme yardımcıları', () => {
  it('desteklenen diller ve varsayılan', () => {
    expect(LOCALES).toEqual(['en', 'tr'])
    expect(DEFAULT_LOCALE).toBe('en')
    expect(isLocale('tr')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('Accept-Language: q değerine ve alt etikete göre', () => {
    expect(localeFromAcceptLanguage('tr-TR,tr;q=0.9,en;q=0.8')).toBe('tr')
    expect(localeFromAcceptLanguage('en-US,en;q=0.9,tr;q=0.5')).toBe('en')
    expect(localeFromAcceptLanguage('en;q=0.5, tr;q=0.9')).toBe('tr')
    expect(localeFromAcceptLanguage('de-DE,fr;q=0.8')).toBeNull()
    expect(localeFromAcceptLanguage('')).toBeNull()
    expect(localeFromAcceptLanguage(null)).toBeNull()
    expect(localeFromAcceptLanguage('tr;q=0')).toBeNull()
  })

  it('BCP-47 etiketi', () => {
    expect(intlLocale('en')).toBe('en-US')
    expect(intlLocale('tr')).toBe('tr-TR')
  })
})

describe('biçimlendirme dile göre', () => {
  it('sayı: Türkçe binlik nokta, ondalık virgül', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
    expect(formatNumber(1234.5, 'tr')).toBe('1.234,5')
  })

  it('tarih dile göre', () => {
    const d = new Date(Date.UTC(2026, 8, 24, 12))
    expect(formatDate(d, 'tr', { month: 'long', timeZone: 'UTC' })).toBe('Eylül')
    expect(formatDate(d, 'en', { month: 'long', timeZone: 'UTC' })).toBe('September')
  })

  it('göreli zaman dile göre', () => {
    const simdi = Date.UTC(2026, 8, 24, 12)
    const uc = simdi - 3 * 3600 * 1000
    expect(formatRelative(uc, 'en', simdi)).toBe('3 hours ago')
    expect(formatRelative(uc, 'tr', simdi)).toBe('3 saat önce')
  })
})
