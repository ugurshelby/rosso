/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

export interface CarSessionSummary {
  hours: number
  sessions: number
  topTracks: {
    title: string
    artist: string
    plays: number
    imageUrl: string | null
  }[]
}

/**
 * Returns the "Sürüş Hafızası" (Car Sessions) Bento data.
 * Kuzey Yıldızı ilkesi uyarınca, kuru istatistik yerine aynalama sağlar.
 */
export async function getCarSessionsSummary(userId: string): Promise<CarSessionSummary | null> {
  try {
    const supabase = await createClient()

    // 1. Toplam süre ve seans bilgisini getir (var olan RPC)
    const { data: summaryRows, error: summaryErr } = await supabase.rpc('car_listening_summary', {
      p_user_id: userId,
    })

    if (summaryErr) throw summaryErr

    const summaryRow = summaryRows?.[0]
    const sessions = Number(summaryRow?.session_count || 0)
    
    if (sessions === 0) {
      return null // Hiç sürüş kaydı yoksa (Technical Log yok)
    }

    const hours = Math.round(Number(summaryRow?.total_hours || 0) * 10) / 10

    // 2. Direksiyon başında en çok dinlenen ilk 2 parça
    const { data: tracksData, error: tracksErr } = await supabase.rpc('journey_car_top_tracks' as any, {
      p_user_id: userId,
      p_limit: 2,
    })

    if (tracksErr) throw tracksErr

    const topTracks = (tracksData || []).map((t: any) => ({
      title: t.title,
      artist: t.artist_name,
      plays: Number(t.plays),
      imageUrl: t.image_url,
    }))

    return {
      hours,
      sessions,
      topTracks,
    }
  } catch (err) {
    void systemLog({
      operation: 'car_sessions_summary',
      userId,
      severity: 'warn',
      errorCode: 'car_sessions_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
