/**
 * Landing scrolly vitrin — modül sahneleri ve mock veri.
 */

export type ShowcaseScene = {
  key: string
  module: string
  eyebrow: string
  title: string
  body: string
  /** Kısa vurucu cümle — editorial panelde vurgu. */
  hook: string
  canvas: string
  accent: string
}

export const SHOWCASE_SCENES: readonly ShowcaseScene[] = [
  {
    key: 'recap',
    module: 'Recap',
    eyebrow: 'Dönemsel ayna',
    title: 'Yıllık rapor yetmez — her ay bir ayna',
    body: 'Wrapped bir yılı özetler. Rosso her ay sana bir kapak, bir hikâye ve o dönemdeki seni verir.',
    hook: 'Mayıs sende uykusuz bir indie ayıydı.',
    canvas: '#12060c',
    accent: '#fb7185',
  },
  {
    key: 'journey',
    module: 'Journey',
    eyebrow: 'Ömür boyu arşiv',
    title: 'Tüm geçmişin, tek yolculuk',
    body: 'Yıl yıl ilerlersin — kırılma anları, keşif patlamaları, o yılın yüzleri. Wrapped bir yılı anlatır; Journey seni.',
    hook: '2020\'de keşif patlaması — hikâyen Aspova ile başladı.',
    canvas: '#0c0814',
    accent: '#9d7aff',
  },
  {
    key: 'vibe',
    module: 'Vibe kartları',
    eyebrow: 'Vibe',
    title: 'Müziğin, seni anlatan bir karaktere dönüşür',
    body: 'Rosso, dinleme alışkanlıklarından sana özel bir karakter çıkarır. Her vibe\'ın kendi adı, tavrı ve görsel dünyası vardır.',
    hook: 'Neon ışıklar, eski duygular ve bitmeyen gece sürüşleri.',
    canvas: '#0c0818',
    accent: '#c084fc',
  },
  {
    key: 'taste',
    module: 'Taste',
    eyebrow: 'Ruh hali ve karakter',
    title: 'Bugün nasılsın? Nasıl biri oldun?',
    body: 'Şu An son günlerinin nabzını tutar. Değişmeyenler yıllardır yanındaki sanatçıları. İki liste karışmaz — ikisi de sen.',
    hook: 'Gece Kurdu: çekirdeğin rock, bu hafta gece yarısı ambient.',
    canvas: '#100c08',
    accent: '#e8a04a',
  },
  {
    key: 'playlists',
    module: 'Çalma listeleri',
    eyebrow: 'Kütüphanen',
    title: 'Listelerin tek yerde',
    body: 'Spotify listelerin, Rosso\'nun ürettiği aylık derlemeler ve detay sayfası — gerçek kapaklar, gerçek şarkı sırası.',
    hook: 'Mayıs - 2026 Rosso\'da üretildi; Gece sürüşü\'nde şarkıları tek tek görürsün.',
    canvas: '#0e0a08',
    accent: '#d4845a',
  },
] as const

/** Vitrin profil fotoğrafları — vibe kartından ayrı (A-FAZ 0.1). */
export const MOCK_AVATARS = {
  selin: '/marketing/fixtures/avatars/selin.jpg',
  emre: '/marketing/fixtures/avatars/emre.jpg',
  deniz: '/marketing/fixtures/avatars/deniz.jpg',
  kaan: '/marketing/fixtures/avatars/kaan.jpg',
} as const

/** Mock kapaklar — public/vibe-cards (1:1 vibe görselleri). */
export const MOCK_COVERS = {
  recap: '/vibe-cards/night-melancholist.webp',
  journeyA: '/vibe-cards/twilight-terraced-hills-monolith.webp',
  journeyB: '/vibe-cards/memory-collector.webp',
  journeyC: '/vibe-cards/firehearted.webp',
  vibeA: '/vibe-cards/neon-drifter.webp',
  vibeB: '/vibe-cards/synthwave-romantic.webp',
  vibeC: '/vibe-cards/stormbearer.webp',
  discoverA: '/vibe-cards/quiet-minimalist.webp',
  discoverB: '/vibe-cards/light-chaser.webp',
  playlistA: '/vibe-cards/pastel-valley-river-blossoms.webp',
  playlistB: '/vibe-cards/warm-sunset-lake-cactus.webp',
  playlistC: '/vibe-cards/cloud-spiral-staircase.webp',
  playlistD: '/vibe-cards/purple-flower-red-background.webp',
  profileVibe: '/vibe-cards/twilight-seeker.webp',
  profilePlaylist: '/vibe-cards/ringed-planets-moons-space.webp',
} as const

export type VibeCardKey = 'neon-drifter' | 'synthwave-romantic' | 'stormbearer'

export type VibeShowcaseCard = {
  id: VibeCardKey
  name: string
  label: string
  cover: string
  descriptionTr: string
  descriptionEn: string
  subTagsTr: string
  subTagsEn: string
  accent: string
}

export const VIBE_SHOWCASE_CARDS: readonly VibeShowcaseCard[] = [
  {
    id: 'neon-drifter',
    name: 'NEON DRIFTER',
    label: 'VIBE',
    cover: MOCK_COVERS.vibeA,
    descriptionTr: 'Geceyi synthwave’lerle yaşayan, kendi ritminden şaşmayan.',
    descriptionEn: 'Drifting through midnight synths, locked into a rhythm all its own.',
    subTagsTr: 'Gece · Synth · Tekrar',
    subTagsEn: 'Night · Synth · Loop',
    accent: '#818cf8',
  },
  {
    id: 'synthwave-romantic',
    name: 'SYNTHWAVE ROMANTIC',
    label: 'VIBE',
    cover: MOCK_COVERS.vibeB,
    descriptionTr: 'Neon ışıklar, eski duygular ve bitmeyen gece sürüşleri.',
    descriptionEn: 'Neon glows, vintage longing, and endless night drives.',
    subTagsTr: 'Retro · Neon · Gece yarısı',
    subTagsEn: 'Retro · Neon · Midnight',
    accent: '#c084fc',
  },
  {
    id: 'stormbearer',
    name: 'STORMBEARER',
    label: 'VIBE',
    cover: MOCK_COVERS.vibeC,
    descriptionTr: 'Güçlü baslar, ağır davullar ve içine çeken karanlık bir enerji.',
    descriptionEn: 'Heavy bass, thunderous drums, and an all-consuming gravity.',
    subTagsTr: 'Güç · Dram · Derin bas',
    subTagsEn: 'Power · Drama · Deep bass',
    accent: '#38bdf8',
  },
] as const

export const VIBE_SECTION_COPY = {
  tr: {
    sectionTag: 'VİBE KARTLARI',
    title: 'Müziğin, seni anlatan bir karaktere dönüşür',
    lead: 'Rosso, dinleme alışkanlıklarından sana özel bir karakter çıkarır. Her vibe’ın kendi adı, tavrı ve görsel dünyası vardır.',
    label: 'VİBE',
  },
  en: {
    sectionTag: 'VIBE CARDS',
    title: 'Your music becomes a character',
    lead: "Rosso turns how you listen into a vibe that's uniquely yours. Each one comes with its own name, persona, and visual world.",
    label: 'VIBE',
  },
} as const

/** Journey vitrin mock verisi — gerçek parça kapakları (Spotify CDN). */
export const MOCK_JOURNEY = {
  activeYear: 2020,
  eraLabel: 'Keşif patlaması',
  breakYear: 2025,
  years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const,
  /* İlk dinleme — vitrinin duygusal çapası. A-FAZ 5: kapak doğrulanmış
     CDN kümesine çekildi (podyum ve login kolajıyla aynı kaynak). */
  origin: {
    date: '12 Mart 2018',
    artist: 'Tame Impala',
    title: 'The Less I Know The Better',
    cover:
      'https://i.scdn.co/image/ab67616d0000b2734806a1c10aa685b1b936158b',
  },
  genres: [
    { label: 'Hip-Hop', share: 48 },
    { label: 'Pop', share: 18 },
    { label: 'Soul', share: 8 },
    { label: 'Rock', share: 6 },
    { label: 'Trap', share: 6 },
    { label: 'Alternatif', share: 5 },
  ],
  discovery: { rate: 95, newArtists: 608, totalArtists: 641 },
  volume: {
    plays: 10_432,
    minutes: '415s 16dk',
    tracks: 1_930,
    artists: 641,
  },
  /* A-FAZ 5 (2026-08-02) — E5 "niche parçalar":
     Podyum niş Türkçe rap parçalarıyla doluydu; vitrin bir tanıtım yüzeyi,
     ziyaretçinin ilk saniyede TANIDIĞI bir şey görmesi gerekiyor. Ayrıca
     "Mevsim Olmayan V" tam da I-FAZ 0'daki seri-öneki sorununun örneğiydi
     — mockup'ta bile o hatayı sergilememeli.

     Kapaklar Taste vitrini ve login kolajıyla AYNI doğrulanmış Spotify
     CDN kümesinden — üç yüzey tek görsel dünya. */
  podium: [
    {
      rank: 1,
      title: 'Midnight City',
      artist: 'M83',
      cover:
        'https://i.scdn.co/image/ab67616d0000b27362100064780b1d919a95fcf4',
    },
    {
      rank: 2,
      title: 'Nightcall',
      artist: 'Kavinsky',
      cover:
        'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
    },
    {
      rank: 3,
      title: 'Creep',
      artist: 'Radiohead',
      cover:
        'https://i.scdn.co/image/ab67616d0000b273ec548c00d3ac2f10be73366d',
    },
  ],
} as const

/** Taste vitrin mock verisi — gerçek parça kapakları (Spotify CDN). */
export const MOCK_TASTE = {
  identity: {
    name: 'Gece Kurdu',
    subtitle: 'Gece dinleyicisi · Hip-Hop çekirdek',
    blurb: 'Rock ve hip-hop omurganda; bu hafta gece yarısı ambient ve synth açılıyor.',
  },
  /* A-FAZ 3 (2026-08-02) — E4 "taste mockup zayıf, gerçek taste zenginliği
     yok": panellerde büyük vibe kartları vardı ama ürünün asıl imzası olan
     Tür DNA hiç görünmüyordu. Kompakt şerit olarak eklendi.
     Renkler `getGenreColor` ile üründeki tam karşılığından alınır —
     mockup'ta ayrı palet İCAT EDİLMEZ. */
  genreStrip: [
    { label: 'Hip-Hop', share: 34 },
    { label: 'Rock', share: 22 },
    { label: 'Elektronik', share: 17 },
    { label: 'Pop', share: 14 },
    { label: 'Alternatif', share: 13 },
  ],
  now: [
    {
      rank: 1,
      title: 'Midnight City',
      artist: 'M83',
      cover:
        'https://i.scdn.co/image/ab67616d0000b27362100064780b1d919a95fcf4',
    },
    {
      rank: 2,
      title: 'Nightcall',
      artist: 'Kavinsky',
      cover:
        'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
    },
  ],
  evergreen: [
    {
      rank: 1,
      title: 'Lose Yourself',
      artist: 'Eminem',
      cover:
        'https://i.scdn.co/image/ab67616d0000b273eab40fc794b88b9d1e012578',
    },
    {
      rank: 2,
      title: 'Creep',
      artist: 'Radiohead',
      cover:
        'https://i.scdn.co/image/ab67616d0000b273ec548c00d3ac2f10be73366d',
    },
  ],
} as const

/** Keşfet vitrin — vurgulanan kulvar. */
export type DiscoverHighlightLane = 'now' | 'evergreen' | 'rare'

/** Keşfet vitrin mock verisi. */
export const MOCK_DISCOVER = {
  headline: 'Frekansına yakın kişiler',
  slotLabel: '2 / 5',
  filterChips: ['Şu An', 'Değişmeyenler', 'Nadir ortak', 'Tümü'] as const,
  activeFilter: 'Şu An' as const,
  hero: {
    name: 'Selin',
    handle: 'selin.k',
    avatar: MOCK_AVATARS.selin,
    affinity: 87,
    highlightLane: 'now' as DiscoverHighlightLane,
    lanes: { now: 92, evergreen: 84, rare: 71 },
    sharedRare: [
      {
        name: 'Mac DeMarco',
        cover:
          'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
      },
      {
        name: 'Tame Impala',
        cover:
          'https://i.scdn.co/image/ab67616d0000b2734806a1c10aa685b1b936158b',
      },
      {
        name: 'Radiohead',
        cover:
          'https://i.scdn.co/image/ab67616d0000b273ec548c00d3ac2f10be73366d',
      },
    ],
    sharedArtists: 12,
    sharedTracks: 34,
    hint: 'Gece seansları · indie keşif',
  },
  others: [
    {
      name: 'Emre',
      handle: 'emre.v',
      affinity: 79,
      avatar: MOCK_AVATARS.emre,
      hint: 'Tame Impala · Aspova',
      lane: 'evergreen' as DiscoverHighlightLane,
    },
    {
      name: 'Deniz',
      handle: 'deniz.m',
      affinity: 74,
      avatar: MOCK_AVATARS.deniz,
      hint: 'Radiohead · odak modu',
      lane: 'rare' as DiscoverHighlightLane,
    },
    {
      name: 'Kaan',
      handle: 'kaan.p',
      affinity: 71,
      avatar: MOCK_AVATARS.kaan,
      hint: 'Gece synth · indie',
      lane: 'now' as DiscoverHighlightLane,
    },
  ],
} as const

/** Mesajlar vitrin mock verisi. */
export const MOCK_MESSAGES = {
  dayLabel: 'Bugün',
  active: {
    name: 'Selin',
    handle: 'selin.k',
    avatar: MOCK_AVATARS.selin,
    affinity: 87,
    mutual: [
      'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
      'https://i.scdn.co/image/ab67616d0000b2734806a1c10aa685b1b936158b',
      'https://i.scdn.co/image/ab67616d0000b273ec548c00d3ac2f10be73366d',
    ],
  },
  threads: [
    {
      handle: 'selin.k',
      name: 'Selin',
      avatar: MOCK_AVATARS.selin,
      preview: 'Mac DeMarco parçası çok iyiymiş…',
      time: '22:14',
      unread: 1,
      active: true,
    },
    {
      handle: 'emre.v',
      name: 'Emre',
      avatar: MOCK_AVATARS.emre,
      preview: 'Gece sürüşü listesi tam benlik',
      time: 'Dün',
      unread: 0,
      active: false,
    },
    {
      handle: 'deniz.m',
      name: 'Deniz',
      avatar: MOCK_AVATARS.deniz,
      preview: 'Radiohead setin harika',
      time: 'Pzt',
      unread: 0,
      active: false,
    },
  ],
  messages: [
    {
      from: 'them' as const,
      time: '22:12',
      text: 'Mayıs recap\'indeki Mac DeMarco parçası çok iyiymiş — aynı frekanstayız galiba.',
      track: {
        title: 'Chamber Of Reflection',
        artist: 'Mac DeMarco',
        cover:
          'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
      },
    },
    {
      from: 'me' as const,
      time: '22:14',
      text: 'Dinledim, playlist\'ine de baktım. Gece sürüşü listesi tam benlik.',
      playlist: {
        title: 'Gece sürüşü',
        meta: '42 parça',
        cover:
          'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
      },
    },
  ],
  typing: true,
  composer: 'Bir parça veya liste paylaş…',
} as const

/** Profil vitrin mock verisi. */
export const MOCK_PROFILE = {
  displayName: 'Emre V.',
  handle: 'emre.v',
  city: 'İstanbul',
  vibeTag: 'Gece Kurdu',
  avatar: MOCK_AVATARS.emre,
  vibeArt: '/vibe-cards/twilight-seeker.webp',
  vibeNarrative: 'Gece yarısı synth ve rock arasında duran bir dinleyici.',
  stats: [
    { label: 'Seri', value: '12 gün' },
    { label: 'Keşif', value: '%34' },
    { label: 'Tür', value: 'Hip-Hop' },
  ],
  genres: [
    { label: 'Hip-Hop', pct: 72 },
    { label: 'Indie', pct: 48 },
    { label: 'Rock', pct: 36 },
  ],
  topArtist: {
    name: 'Mac DeMarco',
    plays: '1.240 dinleme',
    cover:
      'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
  },
  featured: {
    title: 'Gece sürüşü',
    meta: '42 parça · Spotify',
    schedule: 'Her Cuma',
    cover:
      'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
  },
  recent: [
    {
      title: 'Midnight City',
      artist: 'M83',
      cover:
        'https://i.scdn.co/image/ab67616d0000b27362100064780b1d919a95fcf4',
    },
    {
      title: 'Dracula',
      artist: 'Tame Impala',
      cover:
        'https://i.scdn.co/image/ab67616d0000b2734806a1c10aa685b1b936158b',
    },
    {
      title: 'Nightcall',
      artist: 'Kavinsky',
      cover:
        'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
    },
  ],
} as const

/** Çalma listeleri vitrin mock verisi — gerçek kapaklar (Spotify CDN). */
export const MOCK_PLAYLISTS = {
  headline: 'Çalma listelerin',
  library: [
    {
      id: 'gece',
      name: 'Gece sürüşü',
      trackCount: 42,
      platform: 'spotify',
      cover:
        'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
      active: true,
    },
    {
      id: 'mayis',
      name: 'Mayıs - 2026',
      trackCount: 28,
      platform: 'spotify',
      cover:
        'https://i.scdn.co/image/ab67616d0000b27347a5eb940967bc37b899f3bd',
      rossoGenerated: true,
    },
    {
      id: 'sabah',
      name: 'Sabah ritüeli',
      trackCount: 19,
      platform: 'spotify',
      cover:
        'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
    },
    {
      id: 'odak',
      name: 'Odak modu',
      trackCount: 64,
      platform: 'spotify',
      cover:
        'https://i.scdn.co/image/ab67616d0000b27362100064780b1d919a95fcf4',
    },
  ],
  detail: {
    name: 'Gece sürüşü',
    description: 'Gece yolu, synth ve lo-fi — haftalık güncellenir.',
    trackCount: 42,
    duration: '2s 18dk',
    platform: 'Spotify',
    cover:
      'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
    playingRank: 1,
    tracks: [
      {
        rank: 1,
        title: 'Midnight City',
        artist: 'M83',
        duration: '4:03',
        cover:
          'https://i.scdn.co/image/ab67616d0000b27362100064780b1d919a95fcf4',
      },
      {
        rank: 2,
        title: 'Nightcall',
        artist: 'Kavinsky',
        duration: '4:18',
        cover:
          'https://i.scdn.co/image/ab67616d0000b2731c08bca073e89ae32c68ffaa',
      },
      {
        rank: 3,
        title: 'Dracula',
        artist: 'Tame Impala',
        duration: '5:26',
        cover:
          'https://i.scdn.co/image/ab67616d0000b2734806a1c10aa685b1b936158b',
      },
      {
        rank: 4,
        title: 'Chamber Of Reflection',
        artist: 'Mac DeMarco',
        duration: '5:42',
        cover:
          'https://i.scdn.co/image/ab67616d0000b273ec6e9c13eeed14eedbd5f7c9',
      },
    ],
  },
} as const
