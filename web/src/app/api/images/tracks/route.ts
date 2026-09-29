import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Track kapakları — TOPLU uç (B2.3, 2026-07-19 gece oturumu performans turu).
 *
 * Yalnız DB-cache'li görselleri döner (`tracks.image_url` — kalıcı Storage
 * kopyamız): tek auth + tek DB sorgusu, Spotify'a HİÇ gitmez. Cache'te
 * olmayanlar `missing` listesinde döner; istemci (cover-art.tsx) onları
 * mevcut tekil uca (`/api/images/track/[id]`) düşürür — canlı Spotify çekme +
 * arka plan Storage cache davranışı orada, birebir korunur.
 *
 * Rate-limit notu (Anayasa §1.66): bu uç Spotify istek profiline SIFIR etki
 * yapar — tek isteğe inen şey yalnız kendi sunucumuza giden auth'lu istekler.
 */

const MAX_IDS = 50
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('ids') ?? ''
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => UUID_RE.test(s)))].slice(
    0,
    MAX_IDS,
  )

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No valid id' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('tracks').select('id, image_url').in('id', ids)

  if (error) {
    return NextResponse.json({ error: 'Query error' }, { status: 500 })
  }

  const found: Record<string, Array<{ url: string; width: number; height: number }>> = {}
  for (const row of data ?? []) {
    if (row.image_url) {
      found[row.id] = [{ url: row.image_url, width: 640, height: 640 }]
    }
  }
  const missing = ids.filter((id) => !found[id])

  return NextResponse.json(
    { found, missing },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  )
}
