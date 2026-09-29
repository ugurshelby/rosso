import type { Catalog } from '../types'

/** `en/history.ts` ile AYNI yapı. */
export const history: Catalog['history'] = {
  meta: {
    title: 'Dinleme geçmişi',
  },
  header: {
    eyebrow: 'DİNLEME GEÇMİŞİ',
    title: 'En çok dinlediklerin',
    createPlaylist: 'Çalma listesi oluştur',
  },
  tabs: {
    ariaLabel: 'İçerik türü',
    tracks: 'Şarkılar',
    artists: 'Sanatçılar',
    albums: 'Albümler',
  },
  controls: {
    timeRangeAriaLabel: 'Zaman aralığı',
    monthly: 'Aylık',
    yearly: 'Yıllık',
    allTime: 'Tüm zamanlar',
    custom: 'Özel',
    date: 'Tarih',
    sortAriaLabel: 'Sıralama',
    sortByTime: 'Dinleme süresine göre',
    sortByCount: 'Çalma sayısına göre',
    gridAriaLabel: 'Izgara yoğunluğu',
    columns3: '3 sütun',
    columns4: '4 sütun',
    columns5: '5 sütun',
  },
  customRange: {
    start: 'Başlangıç',
    end: 'Bitiş',
    apply: 'Uygula',
  },
  loadingAriaLabel: 'Yükleniyor',
  empty: {
    text: 'Bu aralıkta dinleme kaydı yok.',
    hint: 'Farklı bir zaman aralığı dene.',
  },
  listAriaLabel: '{label} sıralaması',
  playlistDialog: {
    closeAriaLabel: 'Kapat',
    title: 'En çok dinlediklerinden çalma listesi',
    body: 'Bu görünümdeki ({range}) en çok dinlediğin şarkılardan kendini otomatik güncelleyen bir çalma listesi oluştur. Zaman aralığını, sıralamayı ve uzunluğu Otomasyonlar’da ayarla — her gece kendini tazeler.',
    cta: 'Otomasyonlar’da oluştur',
  },
}
