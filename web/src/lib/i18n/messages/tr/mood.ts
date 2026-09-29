/**
 * Mood yüzeyi — Türkçe karşılık. Yapı `en/mood.ts` ile birebir aynı olmalı.
 * NOT: `Catalog['mood']` henüz yok (merkezi kayıt sonrası eklenir) — bu
 * yüzden tip verilmedi.
 */
export const mood = {
  catalogHero: {
    eyebrow: 'Katalog',
    title: 'Tam sana göre küratörlüğü yapılmış müzik',
    subtitle: 'Kendi dinlemelerinden oluşturulan listeler — içinde yaşadığın anlar, geride bıraktığın yıllar ve önündeki gün. Burada hiçbir şey jenerik değil; her liste yalnızca senin verinden geliyor.',
  },
  hero: {
    eyebrow: 'Rosso · An',
    trackCount: {
      one: '{count} şarkı · kendi verinden',
      other: '{count} şarkı · kendi verinden',
    },
    openInSpotify: 'Spotify’da aç',
    dailySyncOnAria: 'Günlük senkron açık — kapatmak için dokun',
    dailySyncOffAria: 'Günlük senkron kapalı — açmak için dokun',
    dailySyncOnTitle: 'Rosso bu Spotify playlistini buradaki listeyle her gün aynı tutar.',
    dailySyncOffTitle: 'Spotify playlistini bu listeyle her gün aynı tutmak için aç.',
    dailySyncOnLabel: 'Günlük senkron açık',
    dailySyncOffLabel: 'Günlük senkronla',
    addToSpotify: 'Spotify’a ekle',
    addedToSpotify: 'Spotify’a eklendi',
    tracksAdded: '{count} şarkı Spotify’a eklendi.',
    addFailed: 'Bir şeyler ters gitti.',
    syncSaveFailed: 'Senkron ayarı kaydedilemedi.',
    overlay: {
      loading: 'Spotify’a ekleniyor…',
      success: 'Spotify’a eklendi',
      error: 'Spotify’a eklenemedi',
    },
  },
  workspace: {
    trackCount: {
      one: '{count} şarkı',
      other: '{count} şarkı',
    },
    tagged: ' · {count} etiketli',
    undoAll: 'Hepsini geri al',
    allClearedMessage: 'Bu andaki tüm şarkıları çıkardın. Aşağıdaki “Elenenler”den geri alabilirsin.',
    trackActionsAria: 'Şarkı eylemleri',
    removeUntaggedAria: '{title} — etiketsiz çıkar',
    removeUntaggedTitle: 'Etiketsiz çıkar',
    excludedAria: 'Elenenler',
    excludedHeading: 'Elenenler ({count})',
    restoreAria: '{title} — listeye geri al',
    restoreTitle: 'Listeye geri al',
  },
  tagMenu: {
    tagButtonFallback: 'Etiketle',
    ariaLabel: '{title} — uygunluk: {tag}',
    menuAriaLabel: '{title} için uygunluk',
    removeTag: 'Etiketi kaldır',
  },
  yearExport: {
    addToSpotify: 'Spotify’a ekle',
    adding: 'Ekleniyor…',
    added: 'Spotify’a eklendi',
    error: 'Bir şeyler ters gitti — tekrar dene.',
  },
} as const
