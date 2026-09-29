/**
 * Ortak metinler. İngilizce = tek doğruluk kaynağı.
 * Marka adları (Rosso, Spotify) çevrilmez ve buraya yazılmaz — bileşende sabit kalır.
 */
export const common = {
  loading: 'Loading…',
  retry: 'Try again',
  cancel: 'Cancel',
  save: 'Save',
  continue: 'Continue',
  back: 'Back',
  skip: 'Skip for now',
  done: 'Done',
  close: 'Close',
  learnMore: 'Learn more',
  /** Dil adları ANA dillerinde yazılır ve çevrilmez (kullanıcı kendi dilini tanır). */
  language: {
    en: 'English',
    tr: 'Türkçe',
  },
} as const
