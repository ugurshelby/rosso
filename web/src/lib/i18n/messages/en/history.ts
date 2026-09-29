/** Listening history (`/gecmis`) yüzeyi — chrome metinleri. */
export const history = {
  meta: {
    title: 'Listening history',
  },
  header: {
    eyebrow: 'LISTENING HISTORY',
    title: 'Your most played',
    createPlaylist: 'Create playlist',
  },
  tabs: {
    ariaLabel: 'Content type',
    tracks: 'Tracks',
    artists: 'Artists',
    albums: 'Albums',
  },
  controls: {
    timeRangeAriaLabel: 'Time range',
    monthly: 'Monthly',
    yearly: 'Yearly',
    allTime: 'All time',
    custom: 'Custom',
    date: 'Date',
    sortAriaLabel: 'Sort',
    sortByTime: 'By listening time',
    sortByCount: 'By play count',
    gridAriaLabel: 'Grid density',
    columns3: '3 columns',
    columns4: '4 columns',
    columns5: '5 columns',
  },
  customRange: {
    start: 'Start',
    end: 'End',
    apply: 'Apply',
  },
  loadingAriaLabel: 'Loading',
  empty: {
    text: 'No listening records in this range.',
    hint: 'Try a different time range.',
  },
  listAriaLabel: '{label} ranking',
  playlistDialog: {
    closeAriaLabel: 'Close',
    title: 'Playlist from your most played',
    body: 'Create a playlist that auto-updates from your most played tracks in this view ({range}). Set the time range, sort order, and length in Automations — it refreshes itself every night.',
    cta: 'Create in Automations',
  },
} as const
