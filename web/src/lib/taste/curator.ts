import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

export interface CuratorArchetype {
  title: string
  tagline: string
  description: string
  preservationRatePct: number
}

export interface CuratorBehavior {
  addedCount: number
  removedCount: number
  curationStrictnessPct: number
  archetype: CuratorArchetype
  hasData: boolean
}

function deriveCuratorArchetype(strictnessPct: number): CuratorArchetype {
  const preservationRatePct = Math.max(0, 100 - strictnessPct)

  if (strictnessPct <= 5) {
    return {
      title: 'Koleksiyoner & Koruyucu',
      tagline: 'Hafıza Odaklı Kütüphane',
      description: 'Eklediğin parçaları birer hayat hatırası gibi koruyorsun; kütüphanen silinen değil biriken bir müze.',
      preservationRatePct,
    }
  }

  if (strictnessPct <= 15) {
    return {
      title: 'Dengeli Küratör',
      tagline: 'Organik Büyüme',
      description: 'Geniş bir müzik kütüphanesine sahipsin; yalnızca zamanla bağını yitiren parçaları sakince eliyorsun.',
      preservationRatePct,
    }
  }

  if (strictnessPct <= 30) {
    return {
      title: 'Titiz Seçici',
      tagline: 'Filtrelenmiş Zevk',
      description: 'Her şarkı listelerinde kalamaz. Zevkin evrildikçe kütüphaneni düzenli olarak saflaştırıyorsun.',
      preservationRatePct,
    }
  }

  return {
    title: 'Müzik Cerrahı',
    tagline: 'Tavizsiz Saflık',
    description: 'Artık seni heyecanlandırmayan hiçbir tınıya yer yok. Kütüphanen yalnızca en taze zevkine adanmış.',
    preservationRatePct,
  }
}

const DEFAULT_ARCHETYPE: CuratorArchetype = {
  title: 'Koleksiyoner & Koruyucu',
  tagline: 'Hafıza Odaklı Kütüphane',
  description: 'Eklediğin parçaları birer hayat hatırası gibi koruyorsun; kütüphanen silinen değil biriken bir müze.',
  preservationRatePct: 100,
}

/**
 * Returns the "Küratör Davranışı" Bento data based on playlist and liked songs events.
 * Executes queries concurrently in parallel to minimize TTFB and database wait time.
 */
export async function getCuratorBehavior(userId: string): Promise<CuratorBehavior> {
  try {
    const supabase = await createClient()

    // Query added and removed events concurrently (3-in-1 parallel round trip)
    const [addedRes, unlikedRes, likedRes] = await Promise.all([
      supabase
        .from('playlist_track_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('liked_songs_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'unliked'),
      supabase
        .from('liked_songs_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'liked'),
    ])

    if (addedRes.error) throw addedRes.error
    if (unlikedRes.error) throw unlikedRes.error
    if (likedRes.error) throw likedRes.error

    const addedCount = addedRes.count || 0
    const unlikedCount = unlikedRes.count || 0
    const likedCount = likedRes.count || 0

    const totalAdds = addedCount + likedCount
    const totalRemoves = unlikedCount
    const totalInteractions = totalAdds + totalRemoves

    if (totalInteractions === 0) {
      return {
        addedCount: 0,
        removedCount: 0,
        curationStrictnessPct: 0,
        archetype: DEFAULT_ARCHETYPE,
        hasData: false,
      }
    }

    const curationStrictnessPct = Math.round((totalRemoves / totalInteractions) * 100)
    const archetype = deriveCuratorArchetype(curationStrictnessPct)

    return {
      addedCount: totalAdds,
      removedCount: totalRemoves,
      curationStrictnessPct,
      archetype,
      hasData: true,
    }
  } catch (err) {
    void systemLog({
      operation: 'curator_behavior',
      userId,
      severity: 'warn',
      errorCode: 'curator_behavior_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return {
      addedCount: 0,
      removedCount: 0,
      curationStrictnessPct: 0,
      archetype: DEFAULT_ARCHETYPE,
      hasData: false,
    }
  }
}
