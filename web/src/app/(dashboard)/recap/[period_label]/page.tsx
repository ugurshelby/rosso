import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getRecapDetail } from '@/lib/recap/read'
import { getRecapKarakteri } from '@/lib/analytics/editorial-read'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { pickRecapCoverArt } from '@/lib/recap/cover-art'
import { donemEtiketiTr } from '@/lib/recap/period-label'
import type { RecapExtrasPayload } from '@/lib/recap/read'
import { getT } from '@/lib/i18n/server'
import { RecapDeck } from '@/components/recap/recap-deck'
import type { NumberOneData } from '@/components/recap/cards/number-one-card'
import type { ObsessionData } from '@/components/recap/cards/obsession-card'
import type { PeakDayData } from '@/components/recap/cards/peak-day-card'
import type { TopArtist } from '@/components/recap/cards/top-artists-card'
import type { TopTrack } from '@/components/recap/cards/top-tracks-card'
import styles from './empty.module.css'

function findTrackImage(
  title: string,
  topTracks: TopTrack[],
  peakDay: PeakDayData | null,
): string | null {
  const norm = (s: string) => cleanTrackTitle(s).trim().toLowerCase()
  const key = norm(title)
  const fromTop = topTracks.find((t) => norm(t.title) === key)
  if (fromTop?.image_url) return fromTop.image_url
  const fromPeak = peakDay?.tracks.find((t) => norm(t.title) === key)
  return fromPeak?.image_url ?? null
}

function findArtistImage(name: string, topArtists: TopArtist[]): string | null {
  const key = name.trim().toLowerCase()
  return topArtists.find((a) => a.name.trim().toLowerCase() === key)?.image_url ?? null
}

function buildNumberOne(
  extras: RecapExtrasPayload | null,
  topArtists: TopArtist[],
  topTracks: TopTrack[],
  peakDay: PeakDayData | null,
): NumberOneData | null {
  const no = extras?.number_one
  if (!no) return null
  const showArtist = Boolean(no.artist_name && no.artist_hours != null && no.artist_hours > 0)
  const showTrack = Boolean(no.track_title && no.track_hours != null && no.track_hours > 0)
  if (!showArtist && !showTrack) return null
  return {
    artistName: no.artist_name,
    artistHours: no.artist_hours,
    artistImageUrl: no.artist_name
      ? (no.artist_image_url || findArtistImage(no.artist_name, topArtists))
      : null,
    trackTitle: no.track_title,
    trackArtist: no.track_artist,
    trackHours: no.track_hours,
    trackImageUrl: no.track_title
      ? (no.track_image_url || findTrackImage(no.track_title, topTracks, peakDay))
      : null,
  }
}

function enrichDiscovery(
  discovery: import('@/lib/recap/read').RecapDiscoveryPayload | null,
  topTracks: TopTrack[],
  topArtists: TopArtist[],
  peakDay: PeakDayData | null,
): import('@/lib/recap/read').RecapDiscoveryPayload | null {
  if (!discovery) return null

  let topTrack = discovery.top_track
  if (topTrack) {
    const fallbackImage = !topTrack.image_url
      ? findTrackImage(topTrack.title, topTracks, peakDay)
      : null
    if (fallbackImage) {
      topTrack = { ...topTrack, image_url: fallbackImage }
    }
  }

  let topArtist = discovery.top_artist
  if (topArtist) {
    const fallbackImage = !topArtist.image_url
      ? findArtistImage(topArtist.name, topArtists)
      : null
    if (fallbackImage) {
      topArtist = { ...topArtist, image_url: fallbackImage }
    }
  }

  return {
    ...discovery,
    top_track: topTrack,
    top_artist: topArtist,
  }
}

export default async function RecapDetailPage({
  params,
}: {
  params: Promise<{ period_label: string }>
}) {
  const user = await requireAuth('/recap')
  const { period_label } = await params

  const recap = await getRecapDetail(user.id, decodeURIComponent(period_label))
  if (recap?.cover) {
    // Editoryal karakter (AI, opsiyonel): yoksa null → kapanış kartı eskisi gibi.
    const character = await getRecapKarakteri(user.id, recap.periodLabel)
    const coverArtId = pickRecapCoverArt(`${user.id}:${recap.periodLabel}`)

    let placard: import('@/components/recap/recap-deck').RecapDeckData['placard'] = null
    if (recap.manifesto && recap.manifesto.minutes > 0) {
      placard = {
        volumeLabel:
          recap.year !== null
            ? `VOL. ${recap.year}`
            : donemEtiketiTr(recap.periodLabel).toLocaleUpperCase('en-US'),
        // Kapak kartıyla AYNI kaynak — final kartı da dönem tipini doğru söylesin (K-2).
        issueLabel: recap.cover.issue_label,
        minutes: recap.manifesto.minutes,
        tracks: recap.manifesto.tracks,
        artists: recap.manifesto.artists,
        coverArtId,
        character,
      }
    }

    const peakDay: PeakDayData | null = recap.peakDay
      ? {
          day: recap.peakDay.day,
          minutes: recap.peakDay.minutes,
          plays: recap.peakDay.plays,
          tracks: recap.peakDay.tracks.map((t) => ({
            title: t.title,
            artist: t.artist,
            plays: t.plays,
            image_url: t.image_url ?? null,
          })),
        }
      : null

    const topTracks: TopTrack[] = recap.topTracks
    const topArtists: TopArtist[] = recap.topArtists.map((a, i) =>
      i === 0 && recap.extras?.number_one?.artist_name === a.name
        ? { ...a, hours: recap.extras.number_one.artist_hours }
        : a,
    )

    let obsession: ObsessionData | null = null
    if (recap.obsession) {
      obsession = {
        title: recap.obsession.title,
        artist: recap.obsession.artist,
        plays: recap.obsession.plays,
        hours: recap.obsession.hours,
        sharePct: recap.obsession.share_pct,
        spanDays: recap.obsession.span_days,
        peakWindowPlays: recap.obsession.peak_window_plays,
        peakWindowStart: recap.obsession.peak_window_start,
        imageUrl: findTrackImage(recap.obsession.title, topTracks, peakDay),
      }
    }

    return (
      <RecapDeck
        data={{
          title: recap.year !== null ? String(recap.year) : donemEtiketiTr(recap.periodLabel),
          coverArtId,
          issueLabel: recap.cover.issue_label,
          manifesto: recap.manifesto
            ? {
                ...recap.manifesto,
                genre_count: recap.extras?.genre_variety?.genre_count,
                new_artists: recap.extras?.discovery_total?.new_artists,
                listening_age: recap.extras?.listening_age?.age,
              }
            : null,
          topArtists,
          topTracks,
          discovery: enrichDiscovery(recap.discovery, topTracks, topArtists, peakDay),
          streak: recap.streak,
          peakDay,
          obsession,
          numberOne: buildNumberOne(recap.extras, topArtists, topTracks, peakDay),
          placard,
          coverTags: character?.tags,
        }}
      />
    )
  }

  const { t } = await getT()

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{t('recap.detail.rebuiltEyebrow')}</p>
        <h1 className={styles.title}>{t('recap.detail.rebuiltTitle')}</h1>
        <p className={styles.body}>{t('recap.detail.rebuiltBody')}</p>
        <Link className={styles.back} href="/recap">
          {t('recap.detail.backLink')}
        </Link>
      </div>
    </main>
  )
}
