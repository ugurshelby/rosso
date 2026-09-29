import type { Catalog } from '../types'

export const quickStart: Catalog['quickStart'] = {
  title: 'Hızlı başlangıç',
  cards: {
    profile: {
      title: 'Profilini oluştur',
      body: 'Kullanıcı adını seç, fotoğraf ve ilgi alanlarını ekle.',
      cta: 'Profili kur',
    },
    spotify: {
      title: 'Spotify’ı bağla',
      body: 'Canlı dinlemeyi açmak için kendi Spotify uygulamanı bağla.',
      cta: 'Spotify’ı bağla',
    },
    zip: {
      title: 'Dinleme geçmişini yükle',
      body: 'Tüm geçmişin Recap, Taste, Journey ve daha fazlasını açar.',
      cta: 'Dosyaları yükle',
      // Türkçe'de sayıdan sonra tekil kullanılır; iki biçim aynı.
      progress: {
        one: '3 dosyadan {count} tanesi yüklendi',
        other: '3 dosyadan {count} tanesi yüklendi',
      },
      nextUp: 'Sıradaki: {missing}',
      eta: 'Spotify her dosyayı genellikle birkaç günde hazırlar — bazen 30 güne kadar sürebilir.',
      processing: 'Dosyaların işleniyor…',
      allDone: 'Üç dosya da tamam.',
    },
  },
  done: {
    title: 'Her şey hazır',
    body: 'Tüm kilitler açıldı.',
  },
}
