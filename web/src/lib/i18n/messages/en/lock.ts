/**
 * Faz kilidi / mühür metinleri (docs/plans/yeni-kullanici-deneyimi-quick-start.md §5, §12).
 * `unlockedBy`: kilidi hangi Quick Start adımının açtığı (`KILIT_KATALOGU.acanAdim`).
 */
export const lock = {
  locked: 'Locked',
  unlocked: 'Unlocked',
  /** Demo persona önizlemesi: kullanıcının kendi verisi DEĞİL — ekran okuyucuya da okunur. */
  samplePreview: 'Sample preview',
  samplePreviewAria: 'Example preview based on a sample listener, not your data',
  unlockedBy: {
    spotify: 'Connect Spotify to unlock this',
    zip: 'Upload your listening history to unlock this',
    zipAccountAndTechnical: 'Upload your Account Data and Technical Log files to unlock this',
  },
  waitingFor: {
    streaming: 'Streaming History',
    account: 'Account Data',
    technical: 'Technical Log',
  },
  celebrate: {
    title: 'Unlocked!',
    body: 'This is now built from your own listening.',
  },
} as const
