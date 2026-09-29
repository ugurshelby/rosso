import Image from 'next/image'
import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react'
import { memo } from 'react'
import {
  MOCK_COVERS,
  MOCK_DISCOVER,
  MOCK_JOURNEY,
  MOCK_MESSAGES,
  MOCK_PLAYLISTS,
  MOCK_PROFILE,
  MOCK_TASTE,
  VIBE_SHOWCASE_CARDS,
  type VibeCardKey,
} from '@/lib/marketing/product-showcase'
import type { Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import styles from './showcase-mockups.module.css'
import {
  RecapMockup,
  JourneyMockup,
  TasteMockup,
  PlaylistsMockup,
} from './living-mockups'

export {
  RecapMockup,
  JourneyMockup,
  TasteMockup,
  PlaylistsMockup,
}

type MockImgProps = {
  src: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  /**
   * A-FAZ 5 (2026-08-02) — L1 "boş kapak" kök nedeni ve VARSAYILANIN
   * DEĞİŞMESİ:
   *
   * Vitrin sahneleri `visibility: hidden` + `opacity: 0` ile başlıyor
   * (`RecapJourneyScroll` → `.sceneLayer`). Tarayıcı `loading="lazy"`
   * görselleri "görünür değil" sayıp hiç indirmiyor; kullanıcı scroll'la
   * sahneye geldiğinde kutular BOŞ kalıyordu.
   *
   * Ölçüldü (2026-08-02): şüphelenilen kapakların tamamı CDN'de 200
   * dönüyor — sorun veride değil, yükleme stratejisindeydi.
   *
   * ⚠ VARSAYILAN GERİ ALINDI — M7 (2026-08-09). Yukarıdaki gerekçe artık
   *   GEÇERSİZ: `.sceneLayer` **kaldırıldı** (A-FAZ 7'de carousel yerine
   *   statik vitrine geçildi), yani görseller artık `visibility: hidden`
   *   bir kapta durmuyor. Ölçüldü: üç vitrin görselinin de `ebeveynGizli
   *   = hayır`, hepsi ekranın 1.400px altında.
   *
   *   `eager` bedeli ölçüldü ve kabul edilebilir DEĞİLDİ: ekran dışındaki
   *   görseller ilk ekrandakilerle bant genişliği için yarışıyor, Slow 4G'de
   *   LCP'yi geciktiriyordu. Varsayılan `lazy` oldu.
   *
   *   Gizli kapta duran bir sahne geri gelirse `eager` ile geçilir — o
   *   zaman bu notu da güncelle.
   */
  eager?: boolean
  /** Recap dışında tüm vibe kartları contain ile gösterilir. */
  fit?: 'cover' | 'contain'
}

function MockImg({
  src,
  className,
  width,
  height,
  fill,
  eager = false,
  fit = 'contain',
}: MockImgProps) {
  /*
   * 🔴 next/image (2026-08-22 refine · Katman 9).
   *
   * Ham <img> kullanılıyordu ve kaynak dosyalar 1500×1500. Ölçüldü:
   * landing 1167KB görsel indiriyordu, en uçta `twilight-seeker` 93px'lik
   * bir kutu için 403KB — 260 kat fazla piksel.
   *
   * `sizes` KRİTİK: onsuz Next yine tam boyutu indirir. Mockup görselleri
   * en fazla ~360px genişlikte gösteriliyor (ölçüldü), 2× DPR payıyla
   * 720px yeter.
   *
   * `quality={70}`: bunlar dekoratif vitrin görselleri, ürünün kendi
   * kapak sanatı değil — kayıp gözle ayırt edilmiyor, kazanç ölçülebilir.
   */
  const ortak = {
    src,
    alt: '',
    draggable: false,
    className,
    loading: eager ? ('eager' as const) : ('lazy' as const),
    sizes: '(max-width: 768px) 50vw, 360px',
    quality: 70,
  }

  if (fill) {
    return (
      <Image
        {...ortak}
        fill
        style={{ objectFit: fit }}
      />
    )
  }

  return (
    <Image
      {...ortak}
      width={width ?? 360}
      height={height ?? 360}
      style={{ objectFit: fit }}
    />
  )
}

/** 1:1 vibe kartı — crop yok, tam görünür. */
function ArtFrame({
  src,
  className,
  eager,
}: {
  src: string
  className?: string
  eager?: boolean
}) {
  return (
    <div className={`${styles.artFrame} ${className ?? ''}`}>
      <MockImg src={src} fill fit="contain" eager={eager} />
    </div>
  )
}

/** Profil fotoğrafı — vibe kartı değil (A-FAZ 0.1). */
function MockAvatar({
  src,
  className,
  eager = false,
}: {
  src: string
  className?: string
  eager?: boolean
}) {
  return (
    <span className={`${styles.mockAvatar} ${className ?? ''}`}>
      <MockImg src={src} fill fit="cover" eager={eager} />
    </span>
  )
}

function MockChrome({ label }: { label: string }) {
  return (
    <div className={styles.mockChrome}>
      <div className={styles.mockDots} aria-hidden>
        <span className={styles.mockDot} />
        <span className={`${styles.mockDot} ${styles.mockDotActive}`} />
        <span className={styles.mockDot} />
      </div>
      <span className={styles.mockLabel}>{label}</span>
    </div>
  )
}

function MockShell({
  label,
  accent,
  children,
}: {
  label: string
  accent: string
  children: ReactNode
}) {
  return (
    <div
      className={styles.mockRoot}
      style={{ ['--mock-accent' as string]: accent } as CSSProperties}
    >
      <MockChrome label={label} />
      <div className={styles.mockBody}>{children}</div>
    </div>
  )
}

/** Albüm kapağı — Journey podyum ve origin için. */
function TrackCover({
  src,
  className,
  size,
}: {
  src: string
  className?: string
  size?: number
}) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
    />
  )
}



/** Kart → yelpazedeki konum sınıfları ve kapak (sıra: A · B · C). */
const VIBE_YERLESIM: Record<
  VibeCardKey,
  { kart: string; satir: string; kapak: string; eager?: boolean }
> = {
  'neon-drifter': { kart: styles.vibeCardA, satir: styles.vibeCaptionLineA, kapak: MOCK_COVERS.vibeA },
  'synthwave-romantic': {
    kart: styles.vibeCardB,
    satir: styles.vibeCaptionLineB,
    kapak: MOCK_COVERS.vibeB,
    eager: true,
  },
  stormbearer: { kart: styles.vibeCardC, satir: styles.vibeCaptionLineC, kapak: MOCK_COVERS.vibeC },
}

/** "NEON DRIFTER" → "Neon Drifter" — yelpaze altı başlık biçimi. */
function baslikHarfi(ad: string): string {
  return ad
    .toLowerCase()
    .split(' ')
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(' ')
}

export const VibeMockup = memo(function VibeMockup({
  accent,
  activeVibeId = 'synthwave-romantic',
  onSelectVibe,
  dil = 'tr',
}: {
  accent: string
  activeVibeId?: string
  onSelectVibe?: (id: string) => void
  dil?: Dil
}) {
  const kartEtiketi = SOZLUK[dil].vibe.kartEtiketi

  return (
    <MockShell label="Vibe" accent={accent}>
      <div className={styles.vibeStage}>
        <div className={styles.vibeGlow} aria-hidden />
        <div className={styles.vibeFan}>
          {VIBE_SHOWCASE_CARDS.map((kart) => {
            const yer = VIBE_YERLESIM[kart.id]
            const aktif = activeVibeId === kart.id
            return (
              <button
                key={kart.id}
                type="button"
                className={`${styles.vibeCard} ${yer.kart} ${aktif ? styles.vibeCardActive : ''}`}
                aria-label={`${baslikHarfi(kart.name)} ${kartEtiketi}`}
                aria-pressed={aktif}
                onClick={() => onSelectVibe?.(kart.id)}
              >
                <ArtFrame src={yer.kapak} eager={yer.eager} />
              </button>
            )
          })}
          <div className={styles.vibeCaption} aria-live="polite">
            <div className={styles.vibeCaptionSet}>
              {VIBE_SHOWCASE_CARDS.map((kart) => (
                <span
                  key={kart.id}
                  className={`${styles.vibeCaptionLine} ${VIBE_YERLESIM[kart.id].satir} ${activeVibeId === kart.id ? styles.vibeCaptionLineActive : ''}`}
                >
                  <span className={styles.vibeLabel}>{baslikHarfi(kart.name)}</span>
                  <span className={styles.vibeSub}>
                    {dil === 'tr' ? kart.subTagsTr : kart.subTagsEn}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockShell>
  )
})



export const DiscoverMockup = memo(function DiscoverMockup({ accent }: { accent: string }) {
  const d = MOCK_DISCOVER
  const h = d.hero
  const laneKeys = ['now', 'evergreen', 'rare'] as const
  const laneLabels: Record<(typeof laneKeys)[number], string> = {
    now: 'Şu an',
    evergreen: 'Değişmeyenler',
    rare: 'Nadir ortak',
  }

  return (
    <MockShell label="Keşfet" accent={accent}>
      <div className={styles.discoverShowcase}>
        <header className={styles.discoverHead}>
          <div className={styles.discoverHeadRow}>
            <div>
              <span className={styles.discoverHeadLabel}>Eşleşme</span>
              <p className={styles.discoverHeadTitle}>{d.headline}</p>
            </div>
            <span className={styles.discoverSlotBadge}>{d.slotLabel}</span>
          </div>
        </header>

        <div className={styles.discoverFilterRow} aria-hidden>
          {d.filterChips.map((chip) => (
            <span
              key={chip}
              className={`${styles.discoverFilterChip} ${chip === d.activeFilter ? styles.discoverFilterChipOn : ''}`}
            >
              {chip}
            </span>
          ))}
        </div>

        <article className={styles.discoverHeroCard}>
          <div className={styles.discoverHeroGlow} aria-hidden />
          <div className={styles.discoverHeroRow}>
            <MockAvatar src={h.avatar} className={styles.discoverHeroAvatar} eager />
            <div className={styles.discoverHeroIdentity}>
              <p className={styles.discoverHeroName}>{h.name}</p>
              <p className={styles.discoverHeroHandle}>@{h.handle}</p>
              <p className={styles.discoverHeroHint}>{h.hint}</p>
            </div>
            <span className={styles.discoverAffinityPill}>{h.affinity}% uyum</span>
          </div>

          <div className={styles.discoverLanePills}>
            {laneKeys.map((lane) => (
              <span
                key={lane}
                className={`${styles.discoverLanePill} ${h.highlightLane === lane ? styles.discoverLanePillOn : ''}`}
              >
                <span className={styles.discoverLanePillValue}>{h.lanes[lane]}</span>
                <span className={styles.discoverLanePillLabel}>{laneLabels[lane]}</span>
              </span>
            ))}
          </div>

          <p className={styles.discoverSharedCounts}>
            {h.sharedArtists} ortak sanatçı · {h.sharedTracks} ortak şarkı
          </p>
          <ul className={styles.discoverRareChips}>
            {h.sharedRare.map((artist) => (
              <li key={artist.name} className={styles.discoverRareChip}>
                <span className={styles.discoverRareCover}>
                  <MockImg src={artist.cover} fill fit="cover" />
                </span>
                <span>{artist.name}</span>
              </li>
            ))}
          </ul>

          <div className={styles.discoverActions}>
            <span className={styles.discoverActionPass}>Geç</span>
            <span className={styles.discoverActionMeet}>Tanış</span>
          </div>
        </article>

        <div className={styles.discoverCompactGrid}>
          {d.others.map((match) => (
            <article key={match.handle} className={styles.discoverCompactCard}>
              <MockAvatar src={match.avatar} className={styles.discoverCompactAvatar} />
              <div className={styles.discoverCompactMeta}>
                <p className={styles.discoverCompactName}>{match.name}</p>
                <p className={styles.discoverCompactHint}>{match.hint}</p>
                <span className={styles.discoverCompactLane}>{laneLabels[match.lane]}</span>
              </div>
              <span className={styles.discoverCompactScore}>%{match.affinity}</span>
            </article>
          ))}
        </div>
      </div>
    </MockShell>
  )
})

export const MessagesMockup = memo(function MessagesMockup({ accent }: { accent: string }) {
  const m = MOCK_MESSAGES

  return (
    <MockShell label="Mesajlar" accent={accent}>
      <div className={styles.messagesShowcase}>
        <header className={styles.messagesChatHead}>
          <MockAvatar src={m.active.avatar} className={styles.messagesHeadAvatar} eager />
          <div className={styles.messagesHeadMeta}>
            <p className={styles.messagesHeadName}>{m.active.name}</p>
            <p className={styles.messagesHeadHandle}>@{m.active.handle}</p>
            <ul className={styles.messagesMutualCovers} aria-label="Ortak sanatçı kapakları">
              {m.active.mutual.map((cover) => (
                <li key={cover} className={styles.messagesMutualCover}>
                  <MockImg src={cover} fill fit="cover" />
                </li>
              ))}
            </ul>
          </div>
          <span className={styles.messagesHeadAffinity}>%{m.active.affinity} uyum</span>
        </header>

        <div className={styles.msgLayout}>
          <div className={styles.msgSidebar}>
            {m.threads.map((thread) => (
              <div
                key={thread.handle}
                className={`${styles.msgThread} ${thread.active ? styles.msgThreadActive : ''}`}
              >
                <MockAvatar src={thread.avatar} className={styles.msgThreadAvatar} />
                <div className={styles.msgThreadCopy}>
                  <div className={styles.msgThreadTop}>
                    <span className={styles.msgThreadName}>@{thread.handle}</span>
                    <span className={styles.msgThreadTime}>{thread.time}</span>
                  </div>
                  <span className={styles.msgThreadPreview}>{thread.preview}</span>
                </div>
                {thread.unread > 0 ? (
                  <span className={styles.msgThreadUnread}>{thread.unread}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className={styles.msgChat}>
            <div className={styles.msgPane}>
              <span className={styles.messagesDayDivider}>{m.dayLabel}</span>
              {m.messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.msgBubbleWrap} ${message.from === 'them' ? styles.msgBubbleWrapThem : styles.msgBubbleWrapMe}`}
                >
                  <div
                    className={`${styles.msgBubble} ${message.from === 'them' ? styles.msgBubbleThem : styles.msgBubbleMe}`}
                  >
                    {message.text}
                    {'track' in message && message.track ? (
                      <span className={styles.msgTrackChip}>
                        <span className={styles.msgTrackCover}>
                          <MockImg src={message.track.cover} fill fit="cover" />
                        </span>
                        <span className={styles.msgTrackCopy}>
                          <span className={styles.msgTrackTitle}>{message.track.title}</span>
                          <span className={styles.msgTrackArtist}>{message.track.artist}</span>
                        </span>
                      </span>
                    ) : null}
                    {'playlist' in message && message.playlist ? (
                      <span className={styles.msgPlaylistChip}>
                        <span className={styles.msgTrackCover}>
                          <MockImg src={message.playlist.cover} fill fit="cover" />
                        </span>
                        <span className={styles.msgTrackCopy}>
                          <span className={styles.msgTrackTitle}>{message.playlist.title}</span>
                          <span className={styles.msgTrackArtist}>{message.playlist.meta}</span>
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <span className={styles.msgTime}>{message.time}</span>
                </div>
              ))}
              {m.typing ? (
                <div className={styles.msgTyping} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
            </div>
            <div className={styles.msgComposer}>
              <span className={styles.msgComposerField}>{m.composer}</span>
              <span className={styles.msgComposerSend} aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </MockShell>
  )
})

export const ProfileMockup = memo(function ProfileMockup({ accent }: { accent: string }) {
  const p = MOCK_PROFILE

  return (
    <MockShell label="Profil" accent={accent}>
      <div className={styles.profileShowcase}>
        <header className={styles.profileHeroBand}>
          <MockAvatar src={p.avatar} className={styles.profileAvatar} eager />
          <div className={styles.profileHeroMeta}>
            <h4 className={styles.profileName}>{p.displayName}</h4>
            <p className={styles.profileHandle}>
              @{p.handle} · {p.city}
            </p>
            <span className={styles.profileVibeTag}>{p.vibeTag}</span>
          </div>
          <div className={styles.profileActions}>
            <span className={styles.profileActionGhost}>Mesaj</span>
            <span className={styles.profileActionPrimary}>Takip et</span>
          </div>
        </header>

        <div className={styles.profileMain}>
          <section className={styles.profileVibePanel}>
            <span className={styles.profileVibeEyebrow}>Kalıcı kimlik</span>
            <div className={styles.profileVibeArtSlot}>
              <div className={styles.profileVibeGlow} aria-hidden />
              <ArtFrame src={p.vibeArt} className={styles.profileVibeHeroArt} eager />
            </div>
            <p className={styles.profileVibeName}>{p.vibeTag}</p>
            <p className={styles.profileVibeBlurb}>{p.vibeNarrative}</p>
          </section>

          <aside className={styles.profileAside}>
            <div className={styles.profileStatRow}>
              {p.stats.map((stat) => (
                <div key={stat.label} className={styles.profileStatCell}>
                  <span className={styles.profileStatValue}>{stat.value}</span>
                  <span className={styles.profileStatLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            <section className={styles.profileTopArtist}>
              <span className={styles.profileFeaturedLabel}>En çok dinlenen</span>
              <div className={styles.profileTopArtistRow}>
                <span className={styles.profileTopArtistCover}>
                  <MockImg src={p.topArtist.cover} fill fit="cover" eager />
                </span>
                <div className={styles.profileTopArtistCopy}>
                  <p className={styles.profileTopArtistName}>{p.topArtist.name}</p>
                  <p className={styles.profileTopArtistMeta}>{p.topArtist.plays}</p>
                </div>
              </div>
            </section>

            <section className={styles.profileGenres}>
              <span className={styles.profileFeaturedLabel}>Tür dağılımı</span>
              <ul className={styles.profileGenreList}>
                {p.genres.map((genre) => (
                  <li key={genre.label} className={styles.profileGenreRow}>
                    <span className={styles.profileGenreLabel}>{genre.label}</span>
                    <span className={styles.profileGenreBar}>
                      <span
                        className={styles.profileGenreFill}
                        style={{ width: `${genre.pct}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.profilePinned}>
              <span className={styles.profileFeaturedLabel}>Öne çıkan liste</span>
              <div className={styles.profilePinnedCard}>
                <span className={styles.profilePlaylistCover}>
                  <MockImg src={p.featured.cover} fill fit="cover" eager />
                </span>
                <div className={styles.profilePinnedCopy}>
                  <p className={styles.profilePlaylistTitle}>{p.featured.title}</p>
                  <p className={styles.profilePlaylistMeta}>{p.featured.meta}</p>
                  <span className={styles.profilePlaylistSchedule}>{p.featured.schedule}</span>
                </div>
              </div>
            </section>

            <section className={styles.profileRecent}>
              <span className={styles.profileRecentLabel}>Son dinlediklerin</span>
              <ul className={styles.profileRecentList}>
                {p.recent.map((track) => (
                  <li key={track.title} className={styles.profileRecentRow}>
                    <span className={styles.profileRecentCover}>
                      <MockImg src={track.cover} fill fit="cover" />
                    </span>
                    <div className={styles.profileRecentCopy}>
                      <span className={styles.profileRecentTitle}>{track.title}</span>
                      <span className={styles.profileRecentArtist}>{track.artist}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </MockShell>
  )
})



const MOCKUP_BY_KEY = {
  recap: RecapMockup,
  journey: JourneyMockup,
  vibe: VibeMockup,
  taste: TasteMockup,
  discover: DiscoverMockup,
  messages: MessagesMockup,
  profile: ProfileMockup,
  playlists: PlaylistsMockup,
} as const

export const ShowcaseMockup = memo(function ShowcaseMockup({
  sceneKey,
  accent,
  activeVibeId,
  onSelectVibe,
  dil,
}: {
  sceneKey: string
  accent: string
  activeVibeId?: string
  onSelectVibe?: (id: string) => void
  /** Yalnız vibe sahnesi iki dilli; diğer sahneler landing'de kullanılmıyor. */
  dil?: Dil
}) {
  if (sceneKey === 'vibe') {
    return (
      <VibeMockup
        accent={accent}
        activeVibeId={activeVibeId}
        onSelectVibe={onSelectVibe}
        dil={dil}
      />
    )
  }
  const Mock = MOCKUP_BY_KEY[sceneKey as keyof typeof MOCKUP_BY_KEY]
  if (!Mock) return null
  return <Mock accent={accent} />
})
