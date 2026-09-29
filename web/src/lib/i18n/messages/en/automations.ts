/**
 * Automations yüzeyi — `components/automations/**` (auto playlist kuralları).
 * `/settings/automations` sayfasının KENDİ metni `settings.automationsPage`'te
 * (sayfa iskeleti settings namespace'inde kaldı); bu dosya yalnız
 * `AutoPlaylistRule` bileşeninin metinlerini taşır.
 */
export const automations = {
  autoPlaylistRule: {
    sortOptions: {
      plays: 'Most plays',
      duration: 'Most time',
    },
    platformLabel: { spotify: 'Spotify' },
    monthly: {
      title: 'Monthly top playlist',
      subtitle: 'Runs on the 1st of each month — last month’s most-played tracks',
      previewWhen: 'on the 1st of each month',
      toggleAria: 'Turn monthly playlist automation on/off',
    },
    yearly: {
      title: 'Yearly top playlist',
      subtitle: 'Runs every January — last year’s most-played tracks',
      previewWhen: 'every January',
      toggleAria: 'Turn yearly playlist automation on/off',
      note: 'The yearly list is only generated in January. Even if you turn it on now, the first list appears next January.',
    },
    fieldLabels: {
      trackCount: 'Track count',
      sortBy: 'Sort by',
      sortByAria: 'Sort measure',
      targetPlatforms: 'Target platforms',
      nameFormat: 'Name format',
    },
    pickPlatform: 'Pick at least one platform',
    example: 'Example',
    lastRun: 'Last run: {date}',
    feedback: {
      saved: 'Saved',
      failed: 'Couldn’t save, try again',
    },
  },
} as const
