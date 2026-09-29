import type { Catalog } from '../types'

/** `en/recap.ts` ile AYNI yapı — story deste kartlarının editoryal içeriği burada YOK (bkz. en/recap.ts notu). */
export const recap: Catalog['recap'] = {
  archive: {
    eyebrow: 'Recap’lerin',
    title: 'Dinleme özeti',
    subtitle:
      'Tamamlanmış aylık ve yıllık dinleme özetlerin. Her Recap, o döneme ait müzikal bir fotoğraf.',
    journeySectionLabel: 'Müzikal yolculuk',
    latestSectionLabel: 'Son recap’ler',
    latestEyebrow: 'Son',
    latestMonthlyEyebrow: 'Son aylık',
    latestYearlyEyebrow: 'Son yıllık',
    openCta: 'Aç →',
    emptyMonthly: 'Geçen ay tamamlanınca burada görünecek',
    emptyYearly: '{year} yıllık recap’in hazırlanıyor',
    locked: {
      badgeLabel: 'Katman 2 · Dinleme Geçmişi ZIP’i Gerekir',
      title: 'Geçmiş yılların hikâyesini aç',
      description:
        'Eski yılların aylık ve yıllık tüm hikâye kartları, Spotify Dinleme Geçmişi ZIP’in işlendiğinde anında canlanır.',
      cta: 'Dinleme geçmişini yükle',
    },
  },
  byYear: {
    eyebrow: 'Arşiv',
    archiveLabel: 'Recap arşivi',
    yearArchiveLabel: '{year} recap arşivi',
    emptyTitle: 'Henüz tamamlanmış Recap yok',
    emptyBody: 'İlk recap’in, ay bitince burada görünecek.',
    emptyLink: 'Spotify geçmişini yükle',
    yearlyLabel: 'Yıllık Recap',
    yearlyPending: '{year} recap’in, yıl bitince hazır olacak',
    openCta: 'Aç →',
  },
  detail: {
    rebuiltEyebrow: 'YENİDEN YAPILANIYOR',
    rebuiltTitle: 'Recap ekranları yenileniyor',
    rebuiltBody:
      'Recap deneyimini yeniden tasarlıyoruz. Verilerin hâlâ burada — yeni ekranlar hazır olduğunda buraya gelecek.',
    backLink: 'Recap arşivine dön',
  },
  deck: {
    closeLabel: 'Recap arşivine dön',
    segmentLabel: '{n}. karta git',
    prevLabel: 'Önceki kart',
    nextLabel: 'Sonraki kart',
    footerExitCue: 'arşive dönmek için sağa dokun',
  },
  placard: {
    coverAlt: 'Dönem kapak görseli',
    backToArchive: 'ARŞİVE DÖN',
  },
  topList: {
    ariaLabel: 'En çok dinlenen',
    eyebrow: 'En çok dinlenen',
    viewAriaLabel: 'Görünüm seç',
    trackTab: 'Şarkı',
    artistTab: 'Sanatçı',
    rankAriaLabel: '{rank}. sıra',
    trackCoverAlt: 'Şarkı kapağı',
    artistAlt: '{name} — sanatçı',
    playsCount: { one: '{count} çalma', other: '{count} çalma' },
  },
  periodSelector: {
    ariaLabel: 'Zaman dilimi',
    week: 'Haftalık',
    month: 'Aylık',
    year: 'Yıllık',
    alltime: 'Tüm zamanlar',
    alltimeSubLabel: 'Başlangıçtan bugüne',
  },
}
