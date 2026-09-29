/**
 * Recap yüzeyi — chrome (buton/nav/başlık/boş durum) metinleri.
 *
 * ÖNEMLİ: `/recap/[period_label]` story deste kartlarının (cover, manifesto,
 * top-artists, top-tracks, discovery, streak, peak-day, obsession, number-one,
 * placard) İÇ metinleri (eyebrow/etiket/istatistik birimi/slogan) BİLİNÇLİ
 * OLARAK bu sözlüğe alınmadı — recap-journey-design.md'nin sinematik/editoryal
 * kart diline ait, "veri kartı değil" (bkz. cover-card.tsx yorum bloğu).
 * Yalnız desteyi ÇEVRELEYEN kabuk (kapat/geri/ileri/çık, dönem seçici, arşiv
 * listesi, boş durumlar) burada.
 */
export const recap = {
  archive: {
    eyebrow: 'Your Recaps',
    title: 'Listening summary',
    subtitle:
      'Your completed monthly and yearly listening summaries. Each Recap is a musical photograph of that period.',
    journeySectionLabel: 'Musical journey',
    latestSectionLabel: 'Latest recaps',
    latestEyebrow: 'Latest',
    latestMonthlyEyebrow: 'Latest monthly',
    latestYearlyEyebrow: 'Latest yearly',
    openCta: 'Open →',
    emptyMonthly: 'It’ll appear here when last month is complete',
    emptyYearly: 'Your {year} yearly recap is being prepared',
    locked: {
      badgeLabel: 'Layer 2 · Requires Listening History ZIP',
      title: 'Unlock the story of past years',
      description:
        'All of your past years’ monthly and yearly story cards come alive the moment your Spotify Listening History ZIP is processed.',
      cta: 'Upload listening history',
    },
  },
  byYear: {
    eyebrow: 'Archive',
    archiveLabel: 'Recap archive',
    yearArchiveLabel: '{year} recap archive',
    emptyTitle: 'No completed Recap yet',
    emptyBody: 'Your first recap will appear here when the month ends.',
    emptyLink: 'Upload Spotify history',
    yearlyLabel: 'Yearly Recap',
    yearlyPending: 'Your {year} recap will be ready when the year ends',
    openCta: 'Open →',
  },
  detail: {
    rebuiltEyebrow: 'BEING REBUILT',
    rebuiltTitle: 'Recap screens are being refreshed',
    rebuiltBody:
      'We’re redesigning the Recap experience. Your data is still here — new screens will land in this place when they’re ready.',
    backLink: 'Back to Recap archive',
  },
  deck: {
    closeLabel: 'Back to Recap archive',
    segmentLabel: 'Go to card {n}',
    prevLabel: 'Previous card',
    nextLabel: 'Next card',
    footerExitCue: 'tap right to return to the archive',
  },
  placard: {
    coverAlt: 'Period cover art',
    backToArchive: 'BACK TO ARCHIVE',
  },
  topList: {
    ariaLabel: 'Most played',
    eyebrow: 'Most played',
    viewAriaLabel: 'Choose view',
    trackTab: 'Track',
    artistTab: 'Artist',
    rankAriaLabel: 'Rank {rank}',
    trackCoverAlt: 'Track cover',
    artistAlt: '{name} — artist',
    playsCount: { one: '{count} play', other: '{count} plays' },
  },
  periodSelector: {
    ariaLabel: 'Time period',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
    alltime: 'All time',
    alltimeSubLabel: 'From the beginning to now',
  },
} as const
