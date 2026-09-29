/**
 * Katalog yüzeyi — albüm/sanatçı/şarkı detay sayfaları (`app/(dashboard)/album`,
 * `/artist`, `/track`) ve destek bileşenleri (`components/catalog`,
 * `components/library`, `components/media`, `components/vibe-cards`).
 *
 * Marka/ürün terimleri çevrilmez (Rosso, Spotify). "Talisman" ürün içinde
 * tanımlı bir kategori adıdır — proper noun gibi davranır, iki dilde de
 * büyük harfle başlar ama TR'de "Tılsım" karşılığı kullanılır (bkz. tr/catalog.ts).
 */
export const catalog = {
  actions: {
    listenOnSpotify: "Listen on Spotify",
  },
  stats: {
    playCount: 'Play count',
    totalTime: 'Total time',
    completionRate: 'Completion rate',
    firstDiscovered: 'First discovered',
    uniqueTracks: 'Unique tracks',
    inPlaylists: 'In playlists',
    skipRate: 'Skip rate',
  },
  album: {
    kindBadge: 'Album',
    trackCount: { one: '{count} track', other: '{count} tracks' },
    completionValue: '{rate}%',
    connectionTitle: 'Your Connection to This Album',
    connectionDescDefault: '{date} in your library · You played it {count} times in total.',
    longTermFallback: 'For a long time',
    discoveredBadge: '{percent}% Discovered',
    completeStoryTitle: 'A Complete Story',
    completeStoryDesc:
      "You experienced this album's tracks as one complete work, without singling any out · {percent}% listening rate.",
    fullAlbumBadge: '★ Full Album Experience',
    standoutTitle: 'Standout Obsession',
    standoutDesc: 'You\'re most hooked on "{track}" from this album ({count} plays).',
    tracklistEyebrow: 'Tracklist',
    tracklistTitle: 'Your Listening History',
  },
  artist: {
    kindBadge: 'Artist',
    plays: { one: '{count} play', other: '{count} plays' },
    tracks: { one: '{count} track', other: '{count} tracks' },
    activeMonths: { one: '{count} active month', other: '{count} active months' },
    connectionTitle: 'Your Connection to the Artist',
    longTermDesc:
      'An indispensable part of your musical universe for {months} months · {duration} total listening.',
    recentDesc: "An artist you've been intensely into lately · played {count} times.",
    steadyDesc: 'One of the artists you listen to regularly · First discovered {date}.',
    inRecordsFallback: 'in your records',
    peakEyebrow: 'Personal Peak',
    mostPlayedTitle: 'Most Played Tracks',
    playsShort: { one: '{count} play', other: '{count} plays' },
    discographyEyebrow: 'Discography',
    discoveredAlbumsTitle: "Albums You've Discovered",
  },
  track: {
    kindBadge: 'Track',
    listsValue: { one: '{count} list', other: '{count} lists' },
    skipRateBadge: '{rate}% (Talisman)',
    connectionTitleDefault: 'Your Connection to the Track',
    connectionDescDefault: '{date} in your library · You played it {count} times in total.',
    longTermFallback: 'For a long time',
    regularListeningBadge: 'Regular Listening',
    talismanTitle: 'Your Personal Talisman',
    talismanDesc: 'You almost never skip this song ({rate}% skip) · Flawless focus and belonging.',
    talismanTrackBadge: '★ Talisman Track',
    circadianTitle: '{tag} Rhythm',
    circadianFallbackTag: 'Circadian',
    circadianDesc: 'You listen to this song most around {time}.',
    circadianBadge: 'At {time}',
    emptyState:
      "You haven't listened to this track yet — it's in your playlist but not in your listening history.",
    rhythmEyebrow: 'Flow Over Time',
    rhythmTitle: 'Your Listening Rhythm',
  },
  listeningStats: {
    talismanBadge: 'Talisman',
    plays: { one: '{count} play', other: '{count} plays' },
    trackCountShort: { one: '{count} track', other: '{count} tracks' },
    unplayedInRosso: 'Unplayed in Rosso',
    timelineTooltip: { one: '{label}: {count} play', other: '{label}: {count} plays' },
    completionPill: '{rate}%',
  },
  likeButton: {
    removedToast: '"{title}" was removed from liked songs.',
    undo: 'Undo',
    busyError: 'Spotify is busy — try again in {wait}.',
    needsConnection: 'You need a Spotify connection.',
    saveFailed: 'Couldn’t save.',
    unlikeAria: 'Unlike {title}',
    likeAria: 'Like {title}',
    unlikeTitle: 'Unlike',
    likeTitle: 'Like',
    refreshAccess: 'Refresh Spotify access',
  },
  vibeCard: {
    artAlt: '{name} vibe card artwork',
  },
} as const
