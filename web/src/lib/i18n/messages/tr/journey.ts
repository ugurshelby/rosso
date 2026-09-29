import type { Catalog } from '../types'

/** `en/journey.ts` ile AYNI yapı — immersive sahnenin editoryal/tematik içeriği burada YOK (bkz. en/journey.ts notu). */
export const journey: Catalog['journey'] = {
  page: {
    lockedBadge: 'Katman 2 · Dinleme Geçmişi ZIP’i Gerekir',
    lockedTitle: 'Müzikal yolculuğunun kapısını aç',
    lockedDescription:
      'Rosso’nun senin yıllar içindeki müzik rotanı, unutulmuş takıntılarını ve kırılma anlarını çizebilmesi için Spotify Dinleme Geçmişi verine ihtiyacı var.',
    lockedCta: 'Dinleme Geçmişi ZIP’ini yükle',
    preparingTitle: 'Journey’in hazırlanıyor',
    preparingBody: 'Müzik geçmişin analiz ediliyor. Birkaç dakika içinde burada olacak.',
    notEnoughTitle: 'Henüz yeterli dinleme yok',
    notEnoughBody: 'Journey’in oluşması için biraz daha müziğe ihtiyaç var.',
    backToRecaps: '← Recap’lere dön',
  },
  card: {
    ariaLabel: 'Müzikal Journey’ini aç',
    eyebrow: 'Müzikal Journey',
    title: 'Journey’in hazır.',
    body: 'Yılların içindeki müziğinin hikâyesi seni bekliyor.',
    cta: 'Journey’e git',
  },
  carSessions: {
    lockedBadge: 'Katman 3 · Teknik Log ZIP’i Gerekir',
    title: 'Sürüş Hafızası',
    lockedDescription:
      'Rosso, araç içi Bluetooth/CarPlay seanslarını inceleyerek direksiyon başındaki en uzun yoldaşlarını ve sürüş karakterini ortaya çıkarır.',
    lockedCta: 'ZIP yükle',
    statLine: '{hours} saat / {sessions} seans',
    playsUnit: '{count} çalma',
    empty: 'Kayıtlı şarkı bulunamadı',
  },
  hero: {
    ariaLabel: 'Journey açılışı',
    soundNowEyebrow: 'Şu anki tınında',
    exitAriaLabel: 'Recap arşivine dön',
    exitLabel: 'Recap arşivi',
    scrollCue: 'Kaydır',
  },
  origin: {
    ariaLabel: 'İlk dinleme',
    eyebrow: 'İlk dinleme',
    playsUnit: 'çalma · bugüne kadar',
    rangeAriaLabel: '{start} ile {end} arası yolculuk',
    yourJourneyLabel: 'Journey’in',
  },
  view: {
    exitAriaLabel: 'Recap arşivine dön',
    beginJourney: 'Yolculuğa başla',
    breakYearBadge: 'Kırılma yılı',
    breakYearTitle: 'Kırılma yılı: büyük tür değişimi',
    latestListen: 'Son dinlenen',
  },
  chapterRail: {
    navAriaLabel: 'Journey bölüm gezinmesi',
    originLabel: 'Başlangıç',
    originAriaLabel: 'Başlangıca git: İlk An',
    chapterAriaLabel: '{year} bölümüne git',
    chapterAriaLabelBreak: '{year} bölümüne git (kırılma yılı)',
    breakTitle: 'Kırılma yılı',
    todayLabel: 'Bugün',
    todayAriaLabel: 'Bugüne ve Sürüş Seanslarına git',
    audioOnAriaLabel: 'Ortam sesini kapat',
    audioOffAriaLabel: 'Ortam 55Hz sesini aç',
    audioOnTitle: 'Akustik rezonans: açık',
    audioOffTitle: 'Akustik rezonans: kapalı',
  },
  finale: {
    ariaLabel: 'Yolculuğun sonu',
    restartAriaLabel: 'Başa dön',
    restartLabel: 'Başa dön',
    backToArchive: 'Recap arşivine dön',
  },
  orbit: {
    viewTrack: 'Şarkıyı görüntüle',
    closeDetails: 'Ayrıntıları kapat',
  },
}
