/**
 * Quick Start metinleri — BAŞLANGIÇ metni (Claude Code, 2026-09-24). Antigravity
 * yeniden yazabilir; YAPI (anahtar adları) değişirse `tr/quick-start.ts` de
 * aynı yapıda güncellenmeli (derleme zamanı kontrolü zorlar).
 *
 * ZIP kartı: `progress` çoğul biçimidir (`tp('quickStart.zip.progress', n)`).
 * `eta`: Spotify'ın veri paketi hazırlama süresi (birkaç gün – 30 gün).
 */
export const quickStart = {
  title: 'Quick start',
  cards: {
    profile: {
      title: 'Create your profile',
      body: 'Pick a username, add a photo and your interests.',
      cta: 'Set up profile',
    },
    spotify: {
      title: 'Connect Spotify',
      body: 'Link your own Spotify app to unlock live listening.',
      cta: 'Connect Spotify',
    },
    zip: {
      title: 'Upload your listening history',
      body: 'Your full history unlocks Recap, Taste, Journey and more.',
      cta: 'Upload files',
      progress: {
        one: '{count} of 3 files uploaded',
        other: '{count} of 3 files uploaded',
      },
      nextUp: 'Next: {missing}',
      eta: 'Spotify usually takes a few days to prepare each file — sometimes up to 30.',
      processing: 'Processing your files…',
      allDone: 'All three files are in.',
    },
  },
  done: {
    title: 'You’re all set',
    body: 'Everything is unlocked.',
  },
} as const
