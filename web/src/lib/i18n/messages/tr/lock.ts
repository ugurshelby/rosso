import type { Catalog } from '../types'

export const lock: Catalog['lock'] = {
  locked: 'Kilitli',
  unlocked: 'Kilit açıldı',
  samplePreview: 'Örnek önizleme',
  samplePreviewAria: 'Örnek bir dinleyiciye dayanan önizleme; senin verin değil',
  unlockedBy: {
    spotify: 'Bunu açmak için Spotify’ı bağla',
    zip: 'Bunu açmak için dinleme geçmişini yükle',
    zipAccountAndTechnical: 'Bunu açmak için Hesap Verisi ve Teknik Günlük dosyalarını yükle',
  },
  waitingFor: {
    streaming: 'Dinleme Geçmişi',
    account: 'Hesap Verisi',
    technical: 'Teknik Günlük',
  },
  celebrate: {
    title: 'Kilit açıldı!',
    body: 'Burası artık kendi dinlemelerinden oluşuyor.',
  },
}
