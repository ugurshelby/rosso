/**
 * Automations yüzeyi — Türkçe karşılık. Yapı `en/automations.ts` ile birebir
 * aynı olmalı. NOT: `Catalog['automations']` henüz yok (merkezi kayıt
 * sonrası eklenir) — bu yüzden tip verilmedi.
 */
export const automations = {
  autoPlaylistRule: {
    sortOptions: {
      plays: 'En çok çalınan',
      duration: 'En çok süre',
    },
    platformLabel: { spotify: 'Spotify' },
    monthly: {
      title: 'Aylık top playlist',
      subtitle: "Her ayın 1'inde çalışır — bir önceki ayın en çok dinlenenleri",
      previewWhen: 'her ayın 1’inde',
      toggleAria: 'Aylık playlist otomasyonunu aç/kapat',
    },
    yearly: {
      title: 'Yıllık top playlist',
      subtitle: 'Her Ocak ayında çalışır — bir önceki yılın en çok dinlenenleri',
      previewWhen: 'her Ocak ayında',
      toggleAria: 'Yıllık playlist otomasyonunu aç/kapat',
      note: 'Yıllık liste yalnız Ocak ayında üretilir. Şimdi açsan bile ilk liste bir sonraki Ocak’ta oluşur.',
    },
    fieldLabels: {
      trackCount: 'Şarkı sayısı',
      sortBy: 'Sıralama ölçütü',
      sortByAria: 'Sıralama ölçütü',
      targetPlatforms: 'Hedef platformlar',
      nameFormat: 'Ad biçimi',
    },
    pickPlatform: 'En az bir platform seç',
    example: 'Örnek',
    lastRun: 'Son çalışma: {date}',
    feedback: {
      saved: 'Kaydedildi',
      failed: 'Kaydedilemedi, tekrar dene',
    },
  },
} as const
