import type { Catalog } from '../types'

/**
 * Ürün terimleri (Recap, Journey, Taste) çevrilmez: hem ürünün kimliği hem
 * pazarlama/onboarding metinleriyle tutarlılık. Çevrilenler: Home,
 * Playlists, History, Settings, Data.
 */
export const nav: Catalog['nav'] = {
  home: 'Ana sayfa',
  journey: 'Journey',
  playlists: 'Çalma listeleri',
  recap: 'Recap',
  history: 'Geçmiş',
  listeningHistory: 'Dinleme geçmişi',
  taste: 'Taste',
  data: 'Veri',
  settings: 'Ayarlar',
  logoHome: 'Rosso — Ana sayfa',
  mainMenu: 'Ana menü',
  mainMenuMobile: 'Ana menü (mobil)',
  locked: 'Kilitli',
}
