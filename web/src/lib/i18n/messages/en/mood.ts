/**
 * Mood yüzeyi — `components/mood/**` (catalog hero, mood hero, workspace,
 * etiket menüsü, year export). `/mood` ve `/mood/[key]` sayfaları yalnız
 * yönlendirme (`permanentRedirect`) — metinleri yok, buraya girmiyor.
 * Kaynak metin ÖNCEDEN Türkçe hardcode'du; İngilizce burada anlam korunarak
 * yazıldı, tek doğruluk kaynağı budur.
 */
export const mood = {
  catalogHero: {
    eyebrow: 'The catalog',
    title: 'Music, curated for exactly you',
    subtitle: 'Playlists built from your own listening — the moments you live in, the years behind you, and the day ahead. Nothing here is generic; every list is drawn from your data alone.',
  },
  hero: {
    eyebrow: 'Rosso · Moment',
    trackCount: {
      one: '{count} track · from your data',
      other: '{count} tracks · from your data',
    },
    openInSpotify: 'Open in Spotify',
    dailySyncOnAria: 'Daily sync on — tap to turn off',
    dailySyncOffAria: 'Daily sync off — tap to turn on',
    dailySyncOnTitle: 'Rosso keeps this Spotify playlist identical to the list here, every day.',
    dailySyncOffTitle: 'Turn on to keep the Spotify playlist identical to this list, every day.',
    dailySyncOnLabel: 'Daily sync on',
    dailySyncOffLabel: 'Sync daily',
    addToSpotify: 'Add to Spotify',
    addedToSpotify: 'Added to Spotify',
    tracksAdded: '{count} tracks added to Spotify.',
    addFailed: 'Something went wrong.',
    syncSaveFailed: 'Sync setting couldn’t be saved.',
    overlay: {
      loading: 'Adding to Spotify…',
      success: 'Added to Spotify',
      error: 'Couldn’t add to Spotify',
    },
  },
  workspace: {
    trackCount: {
      one: '{count} track',
      other: '{count} tracks',
    },
    tagged: ' · {count} tagged',
    undoAll: 'Undo all',
    allClearedMessage: 'You’ve removed every track from this moment. You can bring them back from “Excluded” below.',
    trackActionsAria: 'Track actions',
    removeUntaggedAria: '{title} — remove without a tag',
    removeUntaggedTitle: 'Remove without a tag',
    excludedAria: 'Excluded',
    excludedHeading: 'Excluded ({count})',
    restoreAria: '{title} — bring back to the list',
    restoreTitle: 'Bring back to the list',
  },
  tagMenu: {
    tagButtonFallback: 'Tag',
    ariaLabel: '{title} — fit: {tag}',
    menuAriaLabel: 'Fit for {title}',
    removeTag: 'Remove tag',
  },
  yearExport: {
    addToSpotify: 'Add to Spotify',
    adding: 'Adding…',
    added: 'Added to Spotify',
    error: 'Something went wrong — try again.',
  },
} as const
