import type { MetadataRoute } from 'next'

/**
 * Ana ekrana eklenen web uygulaması (PLAN 2.3, mimari M11: iOS'ta ücretsiz yol).
 * Servis çalışanı (service worker) YOK: kullanıcı verisi önbelleğe alınmaz;
 * Chrome kurulabilirlik için artık istemiyor, iOS "Ana Ekrana Ekle" zaten istemez.
 * Renkler `globals.css` `--bg` (oklch 14.5% 0.015 291.1 → #0a0910).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Rosso',
    short_name: 'Rosso',
    description: 'Your listening history, told back to you.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0910',
    theme_color: '#0a0910',
    categories: ['music', 'lifestyle'],
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
