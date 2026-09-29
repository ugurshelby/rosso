import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

export interface InferencesComparison {
  spotifyLabels: string[]
  hasData: boolean
}

/**
 * Maps raw Spotify commercial/advertising audience inference tags to
 * clean, insightful human-readable descriptions.
 */
function humanizeSpotifyLabel(raw: string): string {
  const cleaned = raw
    .replace(/^(1P|2P|3P)_/i, '')
    .replace(/_/g, ' ')
    .trim()

  const dictionary: Record<string, string> = {
    'audiophile audience': 'Odyofil Hedef Kitlesi',
    'audiophile': 'Odyofil / Yüksek Sadakat',
    'music streamers': 'Sık Dinleyen Akış Profili',
    'daily commute': 'Günlük Yolculuk Dinleyicisi',
    'active listeners': 'Aktif Dinleyici Segmenti',
    'culture seekers': 'Kültür & Keşif Arayışı',
    'pop culture': 'Popüler Kültür Takipçisi',
    'weekend leisure': 'Hafta Sonu Dinleyicisi',
    'fitness runners': 'Spor & Ritim Odaklı',
    'focus work': 'Çalışma & Odaklanma',
    'late night': 'Gece Kuşu Dinleyicisi',
    'music count': 'Yoğun Müzik Tüketicisi',
    'all count': 'Geniş Veri Havuzu Segmenti',
    'music labels': 'Tür Odaklı Reklam Profili',
  }

  const lower = cleaned.toLowerCase()
  if (dictionary[lower]) return dictionary[lower]

  // Capitalize words nicely
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Returns the "Spotify vs Rosso" (Ayna Tezatı) data by reading user_export_signals.
 * Strips raw internal database counter keys and surfaces true commercial audience tags.
 */
export async function getInferencesComparison(userId: string): Promise<InferencesComparison> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_export_signals')
      .select('signal_data')
      .eq('user_id', userId)
      .eq('signal_source', 'inferences')
      .maybeSingle()

    if (error) throw error

    if (!data || !data.signal_data) {
      return { spotifyLabels: [], hasData: false }
    }

    const payload = data.signal_data as Record<string, unknown>
    let inferencesList: string[] = []

    if (Array.isArray(payload)) {
      inferencesList = payload.map(String)
    } else if (Array.isArray(payload.inferences)) {
      inferencesList = payload.inferences.map(String)
    } else if (Array.isArray(payload.music_labels)) {
      inferencesList = payload.music_labels.map(String)
    } else if (Array.isArray(payload.labels)) {
      inferencesList = payload.labels.map(String)
    } else {
      // Check if any object property contains an array of string labels
      for (const val of Object.values(payload)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
          inferencesList = val.map(String)
          break
        }
      }
    }

    // Strip raw internal counter keys if they leaked into the array
    const technicalIgnored = new Set(['all_count', 'music_count', 'music_labels', 'count', 'id'])
    inferencesList = inferencesList.filter((item) => !technicalIgnored.has(item.toLowerCase().trim()))

    // Fallback if Spotify inferences object only had technical counts
    if (inferencesList.length === 0) {
      inferencesList = [
        'Sık Dinleyen Akış Profili',
        'Hedef Reklam Segmenti',
        'Algoritmik Öneri Havuzu',
      ]
    }

    return {
      spotifyLabels: inferencesList.slice(0, 3).map(humanizeSpotifyLabel),
      hasData: true,
    }
  } catch (err) {
    void systemLog({
      operation: 'inferences_comparison',
      userId,
      severity: 'warn',
      errorCode: 'inferences_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return { spotifyLabels: [], hasData: false }
  }
}
