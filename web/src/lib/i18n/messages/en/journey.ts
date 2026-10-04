/**
 * Journey yüzeyi — chrome (nav/buton/çıkış/boş durum) metinleri.
 *
 * ÖNEMLİ: Journey immersive sahnesinin tematik görselleştirme etiketleri
 * (cover-constellation, tectonic-split, daylight-horizon, gravitational-orbit,
 * obsession-topology-widget, journey-vibe-tile içindeki "SONG OF THE YEAR",
 * "Tectonic Shift", "Circadian rhythm", "Gravitational Pull", "Comets/Pillars"
 * vb.) ve journey-finale'deki AI kapanış metni + "Yolculuk devam ediyor"
 * eyebrow'u + şiirsel fallback satırı BİLİNÇLİ OLARAK bu sözlüğe alınmadı —
 * recap-journey-design.md'nin sinematik ritüeline ait, davet edilen bir
 * "hikaye" dili, standart UI kabuğu değil. Yalnız gezinme/kapatma/CTA kabuğu
 * ve boş durumlar burada.
 */
export const journey = {
  page: {
    lockedBadge: 'Layer 2 · Requires Listening History ZIP',
    lockedTitle: 'Unlock the door to your musical journey',
    lockedDescription:
      'Rosso needs your Spotify Listening History to map your music route across the years, your forgotten obsessions, and your turning points.',
    lockedCta: 'Upload Listening History ZIP',
    preparingTitle: 'Your Journey is being prepared',
    preparingBody: 'Your music history is being analyzed. It’ll be here in a few minutes.',
    notEnoughTitle: 'Not enough listening yet',
    notEnoughBody: 'Journey needs a little more music to accumulate.',
    backToRecaps: '← Back to Recaps',
  },
  card: {
    ariaLabel: 'Open your musical Journey',
    eyebrow: 'Musical Journey',
    title: 'Your Journey is ready.',
    body: 'The story of your music across the years is waiting.',
    cta: 'Go to Journey',
  },
  carSessions: {
    lockedBadge: 'Layer 3 · Requires Technical Log ZIP',
    title: 'Drive Memory',
    lockedDescription:
      'Rosso looks at your in-car Bluetooth/CarPlay sessions to surface your longest road companions and driving character.',
    lockedCta: 'Upload ZIP',
    statLine: '{hours} hours / {sessions} sessions',
    playsUnit: '{count} plays',
    empty: 'No recorded tracks found',
  },
  hero: {
    ariaLabel: 'Journey opening',
    soundNowEyebrow: 'Your sound right now',
    exitAriaLabel: 'Back to Recap archive',
    exitLabel: 'Recap archive',
    scrollCue: 'Scroll',
  },
  origin: {
    ariaLabel: 'First listen',
    eyebrow: 'First listen',
    playsUnit: 'plays · to today',
    rangeAriaLabel: '{start} to {end}, journey',
    yourJourneyLabel: 'Your Journey',
  },
  view: {
    exitAriaLabel: 'Back to the recap archive',
    beginJourney: 'Begin the journey',
    breakYearBadge: 'Break year',
    breakYearTitle: 'Break year: major genre mutation',
    latestListen: 'Latest listen',
  },
  chapterRail: {
    companionsLabel: 'Companions',
    currentAriaLabel: 'Current section',
    jumpAriaLabel: 'Jump to a year',
    fallbackLabel: 'Journey',
    navAriaLabel: 'Journey chapters navigation',
    originLabel: 'Origin',
    originAriaLabel: 'Go to Origin: The Beginning',
    chapterAriaLabel: 'Go to chapter {year}',
    chapterAriaLabelBreak: 'Go to chapter {year} (Break year)',
    breakTitle: 'Break year',
    todayLabel: 'Today',
    todayAriaLabel: 'Go to Today and Car Sessions',
    audioOnAriaLabel: 'Turn off ambient sound',
    audioOffAriaLabel: 'Turn on ambient 55Hz sound',
    audioOnTitle: 'Acoustic resonance: on',
    audioOffTitle: 'Acoustic resonance: off',
  },
  companions: {
    eyebrow: 'The ones who stayed',
    title: 'Who was with you',
    artistsLabel: 'Through the years',
    songsLabel: 'Songs you kept coming back to',
    yearsSpan: '{from}–{to} · {count} years',
    inYears: {
      one: '{count} year',
      other: '{count} different years',
    },
    begin: 'Begin with {year}',
  },
  chapter: {
    eyebrow: 'Chapter {index} · {year}',
    songOfYear: 'Song of the year',
    artistOfYear: 'Artist of the year',
    albumOfYear: 'Album of the year',
    seasonsLabel: 'How the year moved',
    densestMonth: '{month}: “{title}” — {plays} plays in a single month',
    plays: {
      one: '{count} play',
      other: '{count} plays',
    },
    hours: {
      one: '{count} hour',
      other: '{count} hours',
    },
    metric: {
      plays: 'plays',
      discovery: 'new artists',
      genres: 'genres',
      repeats: 'repeats per song',
    },
  },
  finale: {
    eyebrow: 'The story goes on',
    spanAriaLabel: 'From {from} to {to}',
    fallbackLine1: 'Every listen is a new line —',
    fallbackLine2: 'the story doesn’t end here.',
    ariaLabel: 'End of journey',
    restartAriaLabel: 'Back to the start',
    restartLabel: 'Back to start',
    backToArchive: 'Back to Recap archive',
  },
  orbit: {
    viewTrack: 'View track',
    closeDetails: 'Close details',
  },
} as const
